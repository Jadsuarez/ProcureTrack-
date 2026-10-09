<?php
/**
 * Procurement workflow order and office visibility rules.
 * Offices see their own stages and handoff states; Procurement has global monitoring access.
 */

function getFlowSteps(): array
{
    return [
        'Registered',
        'Under Budget Review',
        'Reviewed',
        'DV Processing',
        'For Payment',
        'Canvass',
        'PO',
        'Delivered',
        'For Inspection',
        'Accepted',
        'Paid',
        'Completed',
    ];
}

function workflowStageIndex(string $status): int
{
    $idx = array_search($status, getFlowSteps(), true);
    return $idx === false ? -1 : $idx;
}

function statusesForOffice(string $role): array
{
    return match ($role) {
        'budget' => ['Registered', 'Under Budget Review', 'Reviewed', 'Returned'],
        'procurement' => array_merge(getFlowSteps(), ['Returned', 'Cancelled']),
        'pso' => ['PO', 'Delivered', 'For Inspection', 'Accepted'],
        'accounting' => ['Reviewed', 'DV Processing', 'For Payment'],
        'cashier' => ['Accepted', 'Paid', 'Completed'],
        'vc_admin_finance', 'chancellor', 'academic_affairs' => ['Registered'],
        'requesting' => array_merge(getFlowSteps(), ['Returned', 'Cancelled']),
        default => [],
    };
}

function nextStatusForOffice(string $role, string $currentStatus): ?string
{
    $transitions = [
        'budget' => [
            'Registered' => 'Under Budget Review',
            'Under Budget Review' => 'Reviewed',
        ],
        'accounting' => [
            'Reviewed' => 'DV Processing',
            'DV Processing' => 'For Payment',
        ],
        'procurement' => [
            'For Payment' => 'Canvass',
            'Canvass' => 'PO',
        ],
        'pso' => [
            'PO' => 'Delivered',
            'Delivered' => 'For Inspection',
            'For Inspection' => 'Accepted',
        ],
        'cashier' => [
            'Accepted' => 'Paid',
            'Paid' => 'Completed',
        ],
    ];

    return $transitions[$role][$currentStatus] ?? null;
}

function requiredSignaturesComplete(PDO $pdo, int $requestId): bool
{
    $stmt = $pdo->prepare(
        'SELECT
            COUNT(DISTINCT CASE WHEN template_key IN (
                "head_accounting",
                "vice_chancellor_admin_finance",
                "chancellor",
                "vice_chancellor_academic_affairs"
            ) THEN template_key END) AS required_count,
            SUM(CASE WHEN template_key IS NOT NULL AND status <> "Signed" THEN 1 ELSE 0 END) AS unresolved_count
         FROM request_signatories
         WHERE request_id = ?'
    );
    $stmt->execute([$requestId]);
    $state = $stmt->fetch();
    return (int) ($state['required_count'] ?? 0) === 4
        && (int) ($state['unresolved_count'] ?? 0) === 0;
}

function isSignatoryOffice(string $role): bool
{
    return in_array($role, ['accounting', 'vc_admin_finance', 'chancellor', 'academic_affairs'], true);
}

function isRequestVisibleToRole(string $status, string $role): bool
{
    if ($role === 'procurement') {
        return true;
    }
    if (isSignatoryOffice($role) && $status === 'Registered') {
        return false;
    }
    if (isClosedStatus($status)) {
        return in_array($role, ['requesting', 'budget', 'procurement'], true);
    }
    return in_array($status, statusesForOffice($role), true);
}

function requestVisibilityMessage(string $role): string
{
    $label = roleLabel($role);
    return "This request is not currently in the {$label} workflow stage.";
}

function isRequestAccessibleToRole(PDO $pdo, array $request, string $role): bool
{
    $status = (string) ($request['status'] ?? '');
    if (isSignatoryOffice($role) && $status === 'Registered') {
        return canViewRequiredSignatoryRequest($pdo, (int) ($request['id'] ?? 0), $status, $role);
    }
    if ($role === 'budget' && $status === 'Registered') {
        return requiredSignaturesComplete($pdo, (int) ($request['id'] ?? 0))
            && officeForRequestSignatures($pdo, (int) $request['id'], $status) === 'budget';
    }

    return isRequestVisibleToRole($status, $role);
}

function filterRequestsForRole(array $requests, string $role, PDO $pdo): array
{
    return array_values(array_filter(
        $requests,
        fn($r) => isRequestAccessibleToRole($pdo, $r, $role)
    ));
}

/** Office that currently owns a workflow status. */
function officeForStatus(string $status): string
{
    return match ($status) {
        'Registered' => 'requesting',
        'Under Budget Review', 'Reviewed' => 'budget',
        'DV Processing', 'For Payment' => 'accounting',
        'Canvass', 'PO' => 'procurement',
        'Delivered', 'For Inspection', 'Accepted' => 'pso',
        'Paid', 'Completed' => 'cashier',
        'Returned', 'Cancelled' => 'requesting',
        default => 'requesting',
    };
}

function officeForRequestSignatures(PDO $pdo, int $requestId, string $status): string
{
    if ($status === 'Registered') {
        $stmt = $pdo->prepare(
            'SELECT assigned_office FROM request_signatories
             WHERE request_id = ? AND template_key IS NOT NULL
               AND status = "Pending Signature"
             ORDER BY approval_order, id LIMIT 1'
        );
        $stmt->execute([$requestId]);
        $nextOffice = $stmt->fetchColumn();
        if ($nextOffice !== false) {
            return (string) $nextOffice;
        }
        $stmt = $pdo->prepare(
            'SELECT COUNT(*) FROM request_signatories WHERE request_id = ? AND template_key IS NOT NULL'
        );
        $stmt->execute([$requestId]);
        if ((int) $stmt->fetchColumn() > 0) {
            return 'budget';
        }
    }

    return officeForStatus($status);
}

function canViewRequiredSignatoryRequest(PDO $pdo, int $requestId, string $status, string $role): bool
{
    if ($status !== 'Registered' || !isSignatoryOffice($role)) {
        return false;
    }

    return officeForRequestSignatures($pdo, $requestId, $status) === $role;
}

/**
 * Offices that should be pinged when a request is created or moves to $status:
 * the previous office and the next office in the pipeline.
 */
function adjacentOfficesForStatus(string $status): array
{
    $steps = getFlowSteps();
    $idx = workflowStageIndex($status);

    if ($idx < 0) {
        return ['previous' => 'requesting', 'next' => 'budget'];
    }

    $previous = $idx > 0 ? officeForStatus($steps[$idx - 1]) : 'requesting';
    $next = $idx < count($steps) - 1 ? officeForStatus($steps[$idx + 1]) : 'requesting';

    return ['previous' => $previous, 'next' => $next];
}

function officesNotifiedForStatus(string $status): array
{
    $adj = adjacentOfficesForStatus($status);
    $targets = [$adj['previous'], $adj['next'], 'requesting', 'procurement'];
    if ($status === 'Registered') {
        $targets = array_merge($targets, ['accounting', 'vc_admin_finance', 'chancellor', 'academic_affairs']);
    }
    return array_values(array_unique($targets));
}
