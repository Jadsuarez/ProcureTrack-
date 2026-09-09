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
        'PO',
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

function statusesForOffice(string $role): array
{
    return match ($role) {
        'budget' => ['Registered', 'Under Budget Review', 'Reviewed'],
        'procurement' => ['Reviewed', 'Canvass', 'PO'],
        'pso' => ['Delivered', 'For Inspection', 'Accepted'],
        'accounting' => ['Accepted', 'DV Processing', 'For Payment'],
        'cashier' => ['For Payment', 'Paid', 'Completed'],
        default => getFlowSteps(),
    };
}

/** First status at which an office may view a request (previous office handoff). */
function officeVisibilityEntryStatus(string $role): string
{
    return match ($role) {
        'requesting', 'budget' => 'Registered',
        'procurement' => 'Reviewed',
        'pso' => 'Delivered',
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

/** Office that currently owns a workflow status. */
function officeForStatus(string $status): string
{
    return match ($status) {
        'Registered' => 'requesting',
        'Under Budget Review', 'Reviewed' => 'budget',
        'Canvass', 'PO' => 'procurement',
        'Delivered', 'For Inspection', 'Accepted' => 'pso',
        'DV Processing', 'For Payment' => 'accounting',
        'Paid', 'Completed' => 'cashier',
        default => 'requesting',
    };
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
    return array_values(array_unique($targets));
}
