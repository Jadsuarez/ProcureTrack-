<?php
/**
 * Office-scoped analytics: descriptive, diagnostic, predictive
 */
require_once __DIR__ . '/db.php';
require_once __DIR__ . '/workflow.php';
session_start();

if (empty($_SESSION['role'])) {
    jsonResponse(['success' => false, 'message' => 'Unauthorized.'], 401);
}

$role = $_SESSION['role'];
$from = trim($_GET['from'] ?? '');
$to = trim($_GET['to'] ?? '');

if (($from !== '' && !preg_match('/^\d{4}-\d{2}-\d{2}$/', $from))
    || ($to !== '' && !preg_match('/^\d{4}-\d{2}-\d{2}$/', $to))) {
    jsonResponse(['success' => false, 'message' => 'Invalid analytics date format.'], 400);
}
if ($from !== '' && $to !== '' && $from > $to) {
    jsonResponse(['success' => false, 'message' => 'The From date cannot be after the To date.'], 400);
}
$pdo = getConnection();

const FLOW_STEPS = [
    'Registered',
    'Under Budget Review',
    'Reviewed',
    'Canvass',
    'Abstract of Canvass',
    'PO',
    'For Bidding',
    'Bidding Award',
    'Delivered',
    'For Inspection',
    'Accepted',
    'DV Processing',
    'For Payment',
    'Paid',
    'Completed',
];

const BUDGET_STATUSES = ['Registered', 'Under Budget Review', 'Reviewed'];
const PROCUREMENT_STATUSES = ['Reviewed', 'Canvass', 'Abstract of Canvass', 'PO', 'For Bidding', 'Bidding Award'];
const PSO_STATUSES = ['Bidding Award', 'Delivered', 'For Inspection', 'Accepted'];
const ACCOUNTING_STATUSES = ['Accepted', 'DV Processing', 'For Payment'];
const CASHIER_STATUSES = ['For Payment', 'Paid', 'Completed'];

function daysBetween(?string $start, ?string $end): float
{
    if (!$start || !$end) {
        return 0.0;
    }
    $diff = strtotime($end) - strtotime($start);
    return round(max(0, $diff / 86400), 1);
}

function stageIndex(string $status): int
{
    $idx = array_search($status, FLOW_STEPS, true);
    return $idx === false ? 0 : $idx;
}

function officeScope(string $role): array
{
    return match ($role) {
        'budget' => [
            'label' => 'Budget Office',
            'statuses' => BUDGET_STATUSES,
            'focus_stages' => ['Registered', 'Under Budget Review', 'Reviewed'],
            'queue_status' => 'Under Budget Review',
            'handoff_status' => 'Reviewed',
        ],
        'procurement' => [
            'label' => 'Procurement Office',
            'statuses' => PROCUREMENT_STATUSES,
            'focus_stages' => ['Reviewed', 'Canvass', 'Abstract of Canvass', 'PO', 'For Bidding', 'Bidding Award'],
            'queue_status' => 'Canvass',
            'handoff_status' => 'Bidding Award',
        ],
        'pso' => [
            'label' => 'Property and Supply Office',
            'statuses' => PSO_STATUSES,
            'focus_stages' => ['Bidding Award', 'Delivered', 'For Inspection', 'Accepted'],
            'queue_status' => 'Delivered',
            'handoff_status' => 'Accepted',
        ],
        'accounting' => [
            'label' => 'Accounting Office',
            'statuses' => ACCOUNTING_STATUSES,
            'focus_stages' => ['Accepted', 'DV Processing', 'For Payment'],
            'queue_status' => 'DV Processing',
            'handoff_status' => 'For Payment',
        ],
        'cashier' => [
            'label' => 'Cashier',
            'statuses' => CASHIER_STATUSES,
            'focus_stages' => ['For Payment', 'Paid', 'Completed'],
            'queue_status' => 'Paid',
            'handoff_status' => 'Completed',
        ],
        default => [
            'label' => 'Requesting Office',
            'statuses' => FLOW_STEPS,
            'focus_stages' => FLOW_STEPS,
            'queue_status' => 'Registered',
            'handoff_status' => 'Completed',
        ],
    };
}

function inScope(string $status, array $scope): bool
{
    return in_array($status, $scope['statuses'], true);
}

/** Average days spent in each status (from status_logs transitions). */
function avgDaysPerStage(PDO $pdo, ?array $statusFilter = null): array
{
    $sql = 'SELECT request_id, status, created_at FROM status_logs ORDER BY request_id, created_at ASC';
    $rows = $pdo->query($sql)->fetchAll();

    $durations = [];
    $byRequest = [];
    foreach ($rows as $row) {
        $byRequest[$row['request_id']][] = $row;
    }

    foreach ($byRequest as $logs) {
        for ($i = 0; $i < count($logs) - 1; $i++) {
            $status = $logs[$i]['status'];
            if ($statusFilter !== null && !in_array($status, $statusFilter, true)) {
                continue;
            }
            $days = daysBetween($logs[$i]['created_at'], $logs[$i + 1]['created_at']);
            if ($days > 0) {
                $durations[$status][] = $days;
            }
        }
        $last = $logs[count($logs) - 1];
        if ($last['status'] !== 'Completed' && $statusFilter !== null && in_array($last['status'], $statusFilter, true)) {
            $days = daysBetween($last['created_at'], date('Y-m-d H:i:s'));
            if ($days >= 0) {
                $durations[$last['status'] . ' (current)'][] = $days;
            }
        }
    }

    $result = [];
    foreach ($durations as $status => $vals) {
        $result[] = [
            'stage' => $status,
            'avg_days' => round(array_sum($vals) / count($vals), 1),
            'samples' => count($vals),
        ];
    }
    usort($result, fn($a, $b) => $b['avg_days'] <=> $a['avg_days']);
    return $result;
}

/** Remaining stages from current status to Completed. */
function remainingStages(string $current): array
{
    $idx = stageIndex($current);
    if ($idx < 0 || $current === 'Completed') {
        return [];
    }
    return array_slice(FLOW_STEPS, $idx + 1);
}

try {
    $scope = officeScope($role);
    $now = date('Y-m-d H:i:s');
    $thirtyDaysAgo = date('Y-m-d H:i:s', strtotime('-30 days'));

    $allRequests = $pdo->query(
        'SELECT r.*, (SELECT COUNT(*) FROM documents d WHERE d.request_id = r.id) AS doc_count
         FROM requests r ORDER BY r.updated_at DESC'
    )->fetchAll();

    $scoped = array_values(array_filter(
        $allRequests,
        fn($r) => inScope($r['status'], $scope)
            && isRequestVisibleToRole($r['status'], $role)
            && ($from === '' || $r['updated_at'] >= $from . ' 00:00:00')
            && ($to === '' || $r['updated_at'] <= $to . ' 23:59:59')
    ));

    $completed = array_filter($scoped, fn($r) => $r['status'] === 'Completed');
    $active = array_filter($scoped, fn($r) => $r['status'] !== 'Completed');
    $totalScoped = count($scoped);
    $completedCount = count($completed);
    $activeCount = count($active);

    $statusCounts = [];
    foreach ($scoped as $r) {
        $statusCounts[$r['status']] = ($statusCounts[$r['status']] ?? 0) + 1;
    }
    $byStatus = [];
    foreach ($scope['focus_stages'] as $st) {
        if (isset($statusCounts[$st])) {
            $byStatus[] = ['status' => $st, 'count' => $statusCounts[$st]];
        }
    }
    foreach ($statusCounts as $st => $cnt) {
        if (!in_array($st, $scope['focus_stages'], true)) {
            $byStatus[] = ['status' => $st, 'count' => $cnt];
        }
    }

    $createdLast30 = count(array_filter(
        $scoped,
        fn($r) => $r['created_at'] >= $thirtyDaysAgo
    ));

    $withDocs = count(array_filter($scoped, fn($r) => (int) $r['doc_count'] > 0));
    $withoutDocs = $totalScoped - $withDocs;

    $queueCount = $statusCounts[$scope['queue_status']] ?? 0;

    $completionRate = $totalScoped > 0
        ? round(($completedCount / $totalScoped) * 100, 1)
        : 0;

    // Monthly trend (last 6 months) — requests updated per month in scope
    $monthlyTrend = [];
    for ($m = 5; $m >= 0; $m--) {
        $monthStart = date('Y-m-01', strtotime("-$m months"));
        $monthEnd = date('Y-m-t 23:59:59', strtotime($monthStart));
        $label = date('M Y', strtotime($monthStart));
        $count = count(array_filter(
            $scoped,
            fn($r) => $r['updated_at'] >= $monthStart && $r['updated_at'] <= $monthEnd
        ));
        $completedInMonth = count(array_filter(
            $scoped,
            fn($r) => $r['status'] === 'Completed'
                && $r['updated_at'] >= $monthStart
                && $r['updated_at'] <= $monthEnd
        ));
        $monthlyTrend[] = [
            'month' => $label,
            'active_updates' => $count,
            'completed' => $completedInMonth,
        ];
    }

    // --- Diagnostic ---
    $stageFilter = match ($role) {
        'budget' => ['Registered', 'Under Budget Review', 'Reviewed'],
        'procurement' => ['Reviewed', 'Canvass', 'Abstract of Canvass', 'PO', 'For Bidding', 'Bidding Award'],
        'pso' => ['Bidding Award', 'Delivered', 'For Inspection', 'Accepted'],
        'accounting' => ['Accepted', 'DV Processing', 'For Payment'],
        'cashier' => ['For Payment', 'Paid', 'Completed'],
        default => FLOW_STEPS,
    };
    $avgStageDays = avgDaysPerStage($pdo, $stageFilter);

    $bottleneck = $avgStageDays[0] ?? null;

    $stalled = [];
    foreach ($active as $r) {
        $logStmt = $pdo->prepare(
            'SELECT created_at FROM status_logs WHERE request_id = ? AND status = ? ORDER BY created_at DESC LIMIT 1'
        );
        $logStmt->execute([$r['id'], $r['status']]);
        $logRow = $logStmt->fetch();
        $since = $logRow['created_at'] ?? $r['updated_at'];
        $daysInStage = daysBetween($since, $now);
        $stalled[] = [
            'tracking_number' => $r['tracking_number'],
            'title' => $r['title'],
            'status' => $r['status'],
            'days_in_stage' => $daysInStage,
            'updated_by' => $r['updated_by'],
        ];
    }
    usort($stalled, fn($a, $b) => $b['days_in_stage'] <=> $a['days_in_stage']);
    $stalled = array_slice($stalled, 0, 5);

    $avgDaysInQueue = 0.0;
    $queueItems = array_filter($scoped, fn($r) => $r['status'] === $scope['queue_status']);
    if (count($queueItems) > 0) {
        $sum = 0;
        foreach ($queueItems as $r) {
            $logStmt = $pdo->prepare(
                'SELECT created_at FROM status_logs WHERE request_id = ? AND status = ? ORDER BY created_at DESC LIMIT 1'
            );
            $logStmt->execute([$r['id'], $r['status']]);
            $logRow = $logStmt->fetch();
            $sum += daysBetween($logRow['created_at'] ?? $r['created_at'], $now);
        }
        $avgDaysInQueue = round($sum / count($queueItems), 1);
    }

    $backlogRatio = null;
    if ($role === 'budget') {
        $reviewed = $statusCounts['Reviewed'] ?? 0;
        $inReview = $statusCounts['Under Budget Review'] ?? 0;
        $backlogRatio = $inReview > 0 ? round($reviewed / $inReview, 2) : ($reviewed > 0 ? (float) $reviewed : 0);
    } elseif ($role === 'procurement') {
        $inPipeline = ($statusCounts['Canvass'] ?? 0)
            + ($statusCounts['Abstract of Canvass'] ?? 0)
            + ($statusCounts['PO'] ?? 0)
            + ($statusCounts['For Bidding'] ?? 0);
        $awarded = $statusCounts['Bidding Award'] ?? 0;
        $backlogRatio = $inPipeline > 0 ? round($awarded / $inPipeline, 2) : ($awarded > 0 ? (float) $awarded : 0);
    } elseif ($role === 'pso') {
        $inQueue = ($statusCounts['Delivered'] ?? 0) + ($statusCounts['For Inspection'] ?? 0);
        $accepted = $statusCounts['Accepted'] ?? 0;
        $backlogRatio = $inQueue > 0 ? round($accepted / $inQueue, 2) : ($accepted > 0 ? (float) $accepted : 0);
    } elseif ($role === 'accounting') {
        $dv = $statusCounts['DV Processing'] ?? 0;
        $forPayment = $statusCounts['For Payment'] ?? 0;
        $backlogRatio = $dv > 0 ? round($forPayment / $dv, 2) : ($forPayment > 0 ? (float) $forPayment : 0);
    } elseif ($role === 'cashier') {
        $paid = $statusCounts['Paid'] ?? 0;
        $completed = $statusCounts['Completed'] ?? 0;
        $forPayment = $statusCounts['For Payment'] ?? 0;
        $backlogRatio = $forPayment > 0 ? round(($paid + $completed) / $forPayment, 2) : (($paid + $completed) > 0 ? (float) ($paid + $completed) : 0);
    } else {
        $registered = $statusCounts['Registered'] ?? 0;
        $inProgress = $totalScoped - $completedCount - $registered;
        $backlogRatio = $registered > 0 ? round($inProgress / $registered, 2) : ($inProgress > 0 ? (float) $inProgress : 0);
    }

    $missingDocs = [];
    if ($role === 'requesting') {
        foreach ($scoped as $r) {
            if ((int) $r['doc_count'] === 0 && $r['status'] !== 'Completed') {
                $missingDocs[] = [
                    'tracking_number' => $r['tracking_number'],
                    'title' => $r['title'],
                    'status' => $r['status'],
                ];
            }
        }
    }

    // --- Predictive ---
    $globalAvgByStage = [];
    foreach (avgDaysPerStage($pdo) as $row) {
        $key = str_replace(' (current)', '', $row['stage']);
        $globalAvgByStage[$key] = $row['avg_days'];
    }
    foreach (['Registered', 'Under Budget Review', 'Reviewed', 'Canvass', 'Abstract of Canvass', 'PO', 'For Bidding', 'Bidding Award', 'Delivered', 'For Inspection', 'Accepted', 'DV Processing', 'For Payment', 'Paid'] as $st) {
        if (!isset($globalAvgByStage[$st])) {
            $globalAvgByStage[$st] = match ($st) {
                'Registered' => 2.0,
                'Under Budget Review' => 5.0,
                'Reviewed' => 3.0,
                'Canvass' => 7.0,
                'Abstract of Canvass' => 4.0,
                'PO' => 5.0,
                'For Bidding' => 5.0,
                'Bidding Award' => 4.0,
                'Delivered' => 3.0,
                'For Inspection' => 4.0,
                'Accepted' => 2.0,
                'DV Processing' => 4.0,
                'For Payment' => 3.0,
                'Paid' => 2.0,
                default => 3.0,
            };
        }
    }

    $forecasts = [];
    $atRisk = [];
    $projectedCompletions30 = 0;

    foreach ($active as $r) {
        $remaining = remainingStages($r['status']);
        $etaDays = 0.0;
        foreach ($remaining as $st) {
            $etaDays += $globalAvgByStage[$st] ?? 3.0;
        }

        $logStmt = $pdo->prepare(
            'SELECT created_at FROM status_logs WHERE request_id = ? AND status = ? ORDER BY created_at DESC LIMIT 1'
        );
        $logStmt->execute([$r['id'], $r['status']]);
        $logRow = $logStmt->fetch();
        $daysInStage = daysBetween($logRow['created_at'] ?? $r['updated_at'], $now);
        $expectedInStage = $globalAvgByStage[$r['status']] ?? 3.0;
        $risk = $daysInStage > $expectedInStage * 1.5;

        $projectedDate = date('Y-m-d', strtotime("+{$etaDays} days"));
        if ($etaDays <= 30) {
            $projectedCompletions30++;
        }

        $item = [
            'tracking_number' => $r['tracking_number'],
            'title' => $r['title'],
            'status' => $r['status'],
            'eta_days' => round($etaDays, 1),
            'projected_completion' => $projectedDate,
            'at_risk' => $risk,
        ];
        $forecasts[] = $item;
        if ($risk) {
            $atRisk[] = $item;
        }
    }
    usort($forecasts, fn($a, $b) => $a['eta_days'] <=> $b['eta_days']);
    $forecasts = array_slice($forecasts, 0, 8);

    $etaSum = 0;
    foreach ($active as $r) {
        foreach (remainingStages($r['status']) as $st) {
            $etaSum += $globalAvgByStage[$st] ?? 3.0;
        }
    }
    $avgEtaActive = count($active) > 0 ? round($etaSum / count($active), 1) : 0;

    $projectedNewCompletions = min($activeCount, $projectedCompletions30);
    $projectedCompletionRate = $totalScoped > 0
        ? round((($completedCount + $projectedNewCompletions) / $totalScoped) * 100, 1)
        : $completionRate;

    $insights = match ($role) {
        'budget' => [
            'descriptive' => 'Summarizes how many requests are in your budget pipeline, completion rate, and monthly activity.',
            'diagnostic' => 'Identifies average time per budget stage, queue wait times, and requests stuck longest in review.',
            'predictive' => 'Estimates when active requests may finish budget review and flags items likely to miss typical timelines.',
        ],
        'procurement' => [
            'descriptive' => 'Shows procurement-stage volumes from canvass through PO, bidding, and award.',
            'diagnostic' => 'Highlights procurement bottlenecks, stage durations, and the slowest-moving active requests.',
            'predictive' => 'Projects completion dates from historical stage times and counts at-risk procurements.',
        ],
        'pso' => [
            'descriptive' => 'Summarizes requests in the property and supply pipeline from delivery through inspection to acceptance.',
            'diagnostic' => 'Identifies average time per PSO stage and requests stuck longest before accounting handoff.',
            'predictive' => 'Estimates when active requests may reach accepted status based on typical delivery and inspection times.',
        ],
        'accounting' => [
            'descriptive' => 'Summarizes requests in the financial pipeline from accepted through DV processing to for payment.',
            'diagnostic' => 'Identifies average time in DV and payment-prep stages and requests stuck longest before handoff.',
            'predictive' => 'Estimates when active requests may reach for payment based on typical accounting stage durations.',
        ],
        'cashier' => [
            'descriptive' => 'Shows payment-stage volumes from for payment through paid to completed transactions.',
            'diagnostic' => 'Highlights cashier queue wait times and requests awaiting final completion marking.',
            'predictive' => 'Projects when open payment items may be marked completed from historical paid-to-finished times.',
        ],
        default => [
            'descriptive' => 'Overview of all your tracked requests: totals, status mix, documents, and recent activity.',
            'diagnostic' => 'Explains delays—time in each stage, missing documents, and which requests have been idle longest.',
            'predictive' => 'Forecasts likely completion timing for open requests based on average stage durations in the system.',
        ],
    };

    jsonResponse([
        'success' => true,
        'role' => $role,
        'office_label' => $scope['label'],
        'date_range' => ['from' => $from, 'to' => $to],
        'insights' => $insights,
        'descriptive' => [
            'total_in_scope' => $totalScoped,
            'active' => $activeCount,
            'completed' => $completedCount,
            'completion_rate_pct' => $completionRate,
            'created_last_30_days' => $createdLast30,
            'with_documents' => $withDocs,
            'without_documents' => $withoutDocs,
            'queue_count' => $queueCount,
            'queue_status' => $scope['queue_status'],
            'by_status' => $byStatus,
            'monthly_trend' => $monthlyTrend,
        ],
        'diagnostic' => [
            'avg_days_per_stage' => $avgStageDays,
            'bottleneck_stage' => $bottleneck,
            'avg_days_in_queue' => $avgDaysInQueue,
            'backlog_ratio' => $backlogRatio,
            'stalled_requests' => $stalled,
            'missing_documents' => $missingDocs,
        ],
        'predictive' => [
            'avg_eta_days_active' => $avgEtaActive,
            'at_risk_count' => count($atRisk),
            'projected_completions_30_days' => $projectedCompletions30,
            'projected_completion_rate_pct' => $projectedCompletionRate,
            'forecasts' => $forecasts,
            'at_risk' => array_slice($atRisk, 0, 5),
        ],
    ]);
} catch (PDOException $e) {
    jsonResponse(['success' => false, 'message' => 'Analytics error. Ensure the database is imported.'], 500);
}
