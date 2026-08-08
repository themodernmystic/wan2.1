import React from 'react';
import FounderIntentCard from './FounderIntentCard';
import GenomeSnapshotCard from './GenomeSnapshotCard';
import BuildSimulationCards from './BuildSimulationCards';
import PatchPlanCard from './PatchPlanCard';
import PitchPlanCard from './PitchPlanCard';
import ApprovalGateCard from './ApprovalGateCard';
import EmergenceLedgerCard from './EmergenceLedgerCard';

// A GenomeMessage is a special chat message that renders structured genome cards
// type: 'founder_intent' | 'genome_snapshot' | 'build_simulation' | 'patch_plan' | 'pitch_plan' | 'approval_gate' | 'emergence_ledger'
export default function GenomeMessage({ message, onAction }) {
  const { genome_type, genome_data } = message;

  const handleAction = (action) => {
    if (onAction) onAction(action, message);
  };

  switch (genome_type) {
    case 'founder_intent':
      return <FounderIntentCard data={genome_data} onApprove={handleAction} />;

    case 'genome_snapshot':
      return <GenomeSnapshotCard data={genome_data} />;

    case 'build_simulation':
      return <BuildSimulationCards simulations={genome_data} onApprove={handleAction} />;

    case 'patch_plan':
      return <PatchPlanCard data={genome_data} onApprove={handleAction} />;

    case 'pitch_plan':
      return <PitchPlanCard data={genome_data} />;

    case 'approval_gate':
      return <ApprovalGateCard context={genome_data.context} onAction={handleAction} />;

    case 'emergence_ledger':
      return <EmergenceLedgerCard data={genome_data} />;

    default:
      return null;
  }
}