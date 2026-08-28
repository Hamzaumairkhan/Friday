import { useState, useEffect } from 'react';
import {
  CalendarCheck,
  CreditCard,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  ExternalLink,
  Users,
  DollarSign,
  Loader2,
  FileCheck,
  Check,
  X,
  AlertTriangle,
} from 'lucide-react';
import { organizersService } from '../../services/organizers';
import EmptyState from '../../components/shared/EmptyState';
import LoadingSpinner from '../../components/shared/LoadingSpinner';
import toast from 'react-hot-toast';

export default function OrganizerBookingsPage() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL'); // ALL, PENDING, VERIFIED, REJECTED

  // Payment Proof Modal State
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [proofModalOpen, setProofModalOpen] = useState(false);

  // Rejection Dialog State
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [processingAction, setProcessingAction] = useState(false);

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const data = await organizersService.listMyBookings();
      setBookings(data || []);
    } catch (err) {
      console.error('Error fetching organizer bookings:', err);
      toast.error('Failed to load bookings.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const handleVerifyPayment = async (bookingId) => {
    setProcessingAction(true);
    try {
      const updated = await organizersService.verifyPayment(bookingId, { action: 'VERIFY' });
      setBookings((prev) => prev.map((b) => (b.id === bookingId ? updated : b)));
      toast.success('Payment verified! Booking marked as Confirmed.');
      setProofModalOpen(false);
    } catch (err) {
      console.error('Payment verification failed:', err);
      toast.error(err.message || 'Failed to verify payment.');
    } finally {
      setProcessingAction(false);
    }
  };

  const handleRejectPayment = async () => {
    if (!selectedBooking) return;
    setProcessingAction(true);
    try {
      const updated = await organizersService.verifyPayment(selectedBooking.id, {
        action: 'REJECT',
        rejection_reason: rejectionReason || 'Payment receipt not matching bank transfer.',
      });
      setBookings((prev) => prev.map((b) => (b.id === selectedBooking.id ? updated : b)));
      toast.success('Payment marked as rejected. Traveler notified.');
      setRejectModalOpen(false);
      setProofModalOpen(false);
      setRejectionReason('');
    } catch (err) {
      console.error('Payment rejection failed:', err);
      toast.error(err.message || 'Failed to reject payment.');
    } finally {
      setProcessingAction(false);
    }
  };

  const filteredBookings = bookings.filter((b) => {
    if (filter === 'PENDING') return b.payment_status === 'PROOF_UPLOADED' || b.payment_status === 'PENDING';
    if (filter === 'VERIFIED') return b.payment_status === 'VERIFIED';
    if (filter === 'REJECTED') return b.payment_status === 'REJECTED';
    return true;
  });

  const verifiedTotal = bookings
    .filter((b) => b.payment_status === 'VERIFIED')
    .reduce((sum, b) => sum + Number(b.total_price || 0), 0);

  const pendingProofCount = bookings.filter((b) => b.payment_status === 'PROOF_UPLOADED').length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
      {/* ─── Header Section (Stitch 15_bookings_verification.html) ─────── */}
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 border-b border-black/10 pb-8">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] font-semibold text-[#420E00] mb-2" style={{ fontFamily: 'Inter, sans-serif' }}>
            ROAD CREW / AUDIT & LEDGER
          </p>
          <h1
            className="text-5xl sm:text-6xl font-normal text-black leading-tight italic"
            style={{ fontFamily: "'Instrument Serif', serif" }}
          >
            Reconcile your revenue.
          </h1>
        </div>

        <div className="flex gap-4">
          <div className="bg-white rounded-2xl border border-black/10 px-5 py-3 shadow-xs">
            <p className="text-[10px] uppercase font-bold text-[#6F6F6F]">Verified Gross</p>
            <p className="text-xl font-bold text-black" style={{ fontFamily: "'Instrument Serif', serif" }}>
              PKR {verifiedTotal.toLocaleString()}
            </p>
          </div>
          <div className="bg-white rounded-2xl border border-black/10 px-5 py-3 shadow-xs">
            <p className="text-[10px] uppercase font-bold text-[#6F6F6F]">Awaiting Review</p>
            <p className="text-xl font-bold text-[#420E00]" style={{ fontFamily: "'Instrument Serif', serif" }}>
              {pendingProofCount} Slip(s)
            </p>
          </div>
        </div>
      </header>

      {/* ─── Filter Pills ─────────────────────────────────────────────── */}
      <div className="flex gap-3 overflow-x-auto pb-2">
        <button
          onClick={() => setFilter('ALL')}
          className={`px-6 py-2.5 rounded-full text-xs uppercase tracking-widest font-semibold transition-all cursor-pointer ${
            filter === 'ALL'
              ? 'bg-black text-white shadow-xs'
              : 'bg-white text-[#6F6F6F] border border-black/10 hover:border-black/30'
          }`}
        >
          All ({bookings.length})
        </button>
        <button
          onClick={() => setFilter('PENDING')}
          className={`px-6 py-2.5 rounded-full text-xs uppercase tracking-widest font-semibold transition-all cursor-pointer ${
            filter === 'PENDING'
              ? 'bg-black text-white shadow-xs'
              : 'bg-white text-[#6F6F6F] border border-black/10 hover:border-black/30'
          }`}
        >
          Pending Review ({pendingProofCount})
        </button>
        <button
          onClick={() => setFilter('VERIFIED')}
          className={`px-6 py-2.5 rounded-full text-xs uppercase tracking-widest font-semibold transition-all cursor-pointer ${
            filter === 'VERIFIED'
              ? 'bg-black text-white shadow-xs'
              : 'bg-white text-[#6F6F6F] border border-black/10 hover:border-black/30'
          }`}
        >
          Verified ({bookings.filter((b) => b.payment_status === 'VERIFIED').length})
        </button>
      </div>

      {/* ─── Bookings Table / List ────────────────────────────────────── */}
      {loading ? (
        <LoadingSpinner text="Fetching bookings and payment slips..." />
      ) : filteredBookings.length === 0 ? (
        <EmptyState
          title="No bookings in this category"
          description="When travelers reserve your tour packages and submit payment receipts, they will appear here for verification."
        />
      ) : (
        <div className="bg-white rounded-3xl border border-black/10 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-black/10 bg-[#F8FAF6] text-[11px] uppercase font-bold text-[#6F6F6F] tracking-wider">
                  <th className="py-4 px-6">Traveler</th>
                  <th className="py-4 px-6">Tour Package</th>
                  <th className="py-4 px-6">Seats</th>
                  <th className="py-4 px-6">Total Due</th>
                  <th className="py-4 px-6">Payment Proof</th>
                  <th className="py-4 px-6">Status</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5 text-xs text-[#191C1A]">
                {filteredBookings.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-4 px-6 font-semibold text-black">
                      {b.user_name || 'Anonymous Traveler'}
                    </td>
                    <td className="py-4 px-6 max-w-xs truncate font-medium">
                      {b.package_title}
                    </td>
                    <td className="py-4 px-6">{b.travelers} Seats</td>
                    <td className="py-4 px-6 font-bold font-mono">
                      PKR {Number(b.total_price || 0).toLocaleString()}
                    </td>
                    <td className="py-4 px-6">
                      {b.payment_proof_url ? (
                        <button
                          onClick={() => {
                            setSelectedBooking(b);
                            setProofModalOpen(true);
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" /> View Slip
                        </button>
                      ) : (
                        <span className="text-[11px] text-[#6F6F6F]">No slip uploaded</span>
                      )}
                    </td>
                    <td className="py-4 px-6">
                      <span
                        className={`inline-block px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          b.payment_status === 'VERIFIED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : b.payment_status === 'PROOF_UPLOADED'
                            ? 'bg-amber-100 text-amber-900 animate-pulse'
                            : b.payment_status === 'REJECTED'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-slate-100 text-[#6F6F6F]'
                        }`}
                      >
                        {b.payment_status || 'PENDING'}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right space-x-2 whitespace-nowrap">
                      {b.payment_status !== 'VERIFIED' && (
                        <button
                          onClick={() => handleVerifyPayment(b.id)}
                          disabled={processingAction}
                          className="px-4 py-1.5 rounded-full bg-black text-white text-[11px] font-bold uppercase tracking-wider hover:bg-slate-900 transition-all cursor-pointer disabled:opacity-50"
                        >
                          Verify & Confirm
                        </button>
                      )}
                      {b.payment_status !== 'REJECTED' && b.payment_status !== 'VERIFIED' && (
                        <button
                          onClick={() => {
                            setSelectedBooking(b);
                            setRejectModalOpen(true);
                          }}
                          disabled={processingAction}
                          className="px-3 py-1.5 rounded-full border border-red-200 text-red-600 text-[11px] font-bold uppercase tracking-wider hover:bg-red-50 transition-colors cursor-pointer"
                        >
                          Reject
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── Slip Preview Modal ─────────────────────────────────────────── */}
      {proofModalOpen && selectedBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setProofModalOpen(false)} />
          <div className="relative bg-white rounded-3xl max-w-lg w-full p-6 space-y-6 z-10 border border-black/10 shadow-2xl">
            <div className="flex justify-between items-center border-b border-black/10 pb-4">
              <h3 className="text-xl font-normal text-black" style={{ fontFamily: "'Instrument Serif', serif" }}>
                Payment Slip — {selectedBooking.user_name}
              </h3>
              <button onClick={() => setProofModalOpen(false)} className="p-1 rounded-full hover:bg-slate-100">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="max-h-[400px] overflow-auto rounded-2xl border border-black/10 bg-slate-50 flex items-center justify-center p-2">
              <img
                src={selectedBooking.payment_proof_url}
                alt="Payment Transaction Slip"
                className="max-h-[380px] w-auto object-contain rounded-xl"
              />
            </div>

            <div className="flex justify-between items-center pt-2">
              <span className="text-xs font-bold text-black font-mono">
                Amount: PKR {Number(selectedBooking.total_price || 0).toLocaleString()}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => handleVerifyPayment(selectedBooking.id)}
                  disabled={processingAction}
                  className="px-6 py-2.5 rounded-full bg-black text-white text-xs font-bold uppercase tracking-wider hover:bg-slate-900 cursor-pointer"
                >
                  Verify Now
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Rejection Reason Modal ───────────────────────────────────── */}
      {rejectModalOpen && selectedBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setRejectModalOpen(false)} />
          <div className="relative bg-white rounded-3xl max-w-md w-full p-6 space-y-6 z-10 border border-black/10 shadow-2xl">
            <div className="flex justify-between items-center border-b border-black/10 pb-4">
              <h3 className="text-xl font-normal text-red-600" style={{ fontFamily: "'Instrument Serif', serif" }}>
                Reject Payment Proof
              </h3>
              <button onClick={() => setRejectModalOpen(false)} className="p-1 rounded-full hover:bg-slate-100">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <label className="block text-xs uppercase font-bold text-[#6F6F6F]">Reason for Rejection</label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="e.g. Transaction reference ID does not appear in bank statement..."
                rows={3}
                className="w-full bg-[#F8FAF6] border border-black/10 rounded-2xl p-4 text-xs text-black focus:outline-none focus:border-black resize-none"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setRejectModalOpen(false)}
                className="px-5 py-2.5 rounded-full border border-black/10 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleRejectPayment}
                disabled={processingAction}
                className="px-6 py-2.5 rounded-full bg-red-600 text-white text-xs font-bold uppercase tracking-wider hover:bg-red-700"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
