<?php
/**
 * Procurement workflow order and office visibility rules.
 * An office cannot see a request until it reaches that office's pipeline entry status.
 */

function getFlowSteps(): array
{
    return [
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
}

function workflowStageIndex(string $status): int
{
    $idx = array_search($status, getFlowSteps(), true);
    return $idx === false ? -1 : $idx;
}

/** First status at which an office may view a request (previous office handoff). */
function officeVisibilityEntryStatus(string $role): string
{
    return match ($role) {
        'requesting', 'budget' => 'Registered',
        'procurement' => 'Reviewed',
        'pso' => 'Bidding Award',
        'accounting' => 'Accepted',
        'cashier' => 'For Payment',
        default => 'Registered',
    };
}

function isRequestVisibleToRole(string $status, string $role): bool
{
    $entry = officeVisibilityEntryStatus($role);
    $statusIdx = workflowStageIndex($status);
    $entryIdx = workflowStageIndex($entry);

    if ($statusIdx < 0 || $entryIdx < 0) {
        return $role === 'requesting';
    }

    return $statusIdx >= $entryIdx;
}

function requestVisibilityMessage(string $role): string
{
    $entry = officeVisibilityEntryStatus($role);
    $label = roleLabel($role);

    if ($entry === 'Registered') {
        return 'Request not found.';
    }

    return "This request is not available to {$label} yet. It must reach \"{$entry}\" first (previous office must complete their stage).";
}

function filterRequestsForRole(array $requests, string $role): array
{
    return array_values(array_filter(
        $requests,
        fn($r) => isRequestVisibleToRole($r['status'] ?? '', $role)
    ));
}
