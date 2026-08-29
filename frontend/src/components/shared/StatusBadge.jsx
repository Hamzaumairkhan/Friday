import { Badge } from '../ui/badge';
import { Check, ShieldCheck } from 'lucide-react';

export default function StatusBadge({ status, type = 'booking' }) {
  if (!status) return null;

  const normalized = status.toUpperCase();

  // Booking statuses
  if (type === 'booking') {
    switch (normalized) {
      case 'PENDING':
        return <Badge variant="warning">Pending Confirmation</Badge>;
      case 'CONFIRMED':
        return <Badge variant="success">Confirmed</Badge>;
      case 'REJECTED':
        return <Badge variant="destructive">Rejected</Badge>;
      case 'CANCELLED':
        return <Badge variant="secondary">Cancelled</Badge>;
      case 'COMPLETED':
        return <Badge variant="info">Completed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  }

  // Payment statuses
  if (type === 'payment') {
    switch (normalized) {
      case 'PENDING':
        return <Badge variant="secondary">Payment Pending</Badge>;
      case 'PROOF_UPLOADED':
        return <Badge variant="warning">Proof Uploaded (Pending Review)</Badge>;
      case 'VERIFIED':
        return (
          <Badge variant="success" className="inline-flex items-center gap-1">
            <Check className="w-3 h-3" />
            <span>Payment Verified</span>
          </Badge>
        );
      case 'REJECTED':
        return <Badge variant="destructive">Payment Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  }

  // Verification statuses for organizers
  if (type === 'verification') {
    switch (normalized) {
      case 'PLATFORM_CURATED':
      case 'VERIFIED':
        return (
          <Badge variant="success" className="inline-flex items-center gap-1">
            <ShieldCheck className="w-3 h-3" />
            <span>Verified Organizer</span>
          </Badge>
        );
      case 'PENDING':
        return <Badge variant="warning">Verification Pending</Badge>;
      case 'REJECTED':
        return <Badge variant="destructive">Not Verified</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  }

  return <Badge variant="outline">{status}</Badge>;
}
