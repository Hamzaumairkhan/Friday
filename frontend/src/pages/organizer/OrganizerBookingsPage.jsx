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
  Trash2,
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

  // Delete Booking Dialog State
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [bookingToDelete, setBookingToDelete] = useState(null);

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

  const handleDeleteBooking = async () => {
    if (!bookingToDelete) return;
    setProcessingAction(true);
    try {
      await organizersService.deleteBooking(bookingToDelete.id);
      setBookings((prev) => prev.filter((b) => b.id !== bookingToDelete.id));
      toast.success('Booking reservation successfully deleted.');
      setDeleteModalOpen(false);
      setBookingToDelete(null);
    } catch (err) {
      console.error('Delete booking failed:', err);
      toast.error(err.message || 'Failed to delete booking reservation.');
    } finally {
      setProcessingAction(false);
    }
  };

  const [selectedPackageId, setSelectedPackageId] = useState('ALL');

  // Extract unique packages from bookings list
  const uniquePackagesMap = {};
  bookings.forEach((b) => {
    if (b.package_id && !uniquePackagesMap[b.package_id]) {
      uniquePackagesMap[b.package_id] = b.package_title || `Tour Package #${b.package_id.slice(0, 6)}`;
    }
  });
  const uniquePackageList = Object.entries(uniquePackagesMap).map(([id, title]) => ({ id, title }));

  const filteredBookings = bookings.filter((b) => {
    // Status filter
    if (filter === 'PENDING' && !(b.payment_status === 'PROOF_UPLOADED' || b.payment_status === 'PENDING')) return false;
    if (filter === 'VERIFIED' && b.payment_status !== 'VERIFIED') return false;
    if (filter === 'REJECTED' && b.payment_status !== 'REJECTED') return false;
    // Package filter
    if (selectedPackageId !== 'ALL' && b.package_id !== selectedPackageId) return false;
    return true;
  });

  const verifiedTotal = filteredBookings
    .filter((b) => b.payment_status === 'VERIFIED')
    .reduce((sum, b) => sum + Number(b.total_price || 0), 0);

  const pendingProofCount = filteredBookings.filter((b) => b.payment_status === 'PROOF_UPLOADED').length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10">
      {/* ─── Header Section ─────────────────────────────────────────── */}
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 border-b border-black/10 pb-8">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] font-semibold text-[#420E00] mb-2" style={{ fontFamily: 'Inter, sans-serif' }}>
            ORGANIZER WORKSPACE / BOOKINGS & LEDGER
          </p>
          <h1
            className="text-4xl sm:text-6xl font-normal text-[#00261D] leading-tight italic"
            style={{ fontFamily: "'Instrument Serif', serif" }}
          >
            Reconcile your revenue.
          </h1>
          <p className="text-xs sm:text-sm text-[#717975] mt-1" style={{ fontFamily: 'Inter, sans-serif' }}>
            Review direct booking receipts, verify traveler bank transfers, and confirm reservations.
          </p>
        </div>

        <div className="flex gap-3">
          <div className="bg-white rounded-2xl border border-black/10 px-5 py-3 shadow-2xs">
            <p className="text-[10px] uppercase font-bold text-[#717975]">Verified Gross</p>
            <p className="text-xl font-normal text-[#00261D]" style={{ fontFamily: "'Instrument Serif', serif" }}>
              PKR {verifiedTotal.toLocaleString()}
            </p>
          </div>
          <div className="bg-white rounded-2xl border border-black/10 px-5 py-3 shadow-2xs">
            <p className="text-[10px] uppercase font-bold text-[#717975]">Awaiting Review</p>
            <p className="text-xl font-normal text-[#420E00]" style={{ fontFamily: "'Instrument Serif', serif" }}>
              {pendingProofCount} Slip(s)
            </p>
          </div>
        </div>
      </header>

      {/* ─── Filter Pills & Tour Package Filter ─────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex gap-2.5 overflow-x-auto pb-1">
          <button
            onClick={() => setFilter('ALL')}
            className={`px-5 py-2 rounded-full text-xs uppercase tracking-wider font-semibold transition-all cursor-pointer ${
              filter === 'ALL'
                ? 'bg-[#00261D] text-white shadow-2xs'
                : 'bg-white text-[#717975] border border-black/10 hover:border-black/30'
            }`}
          >
            All ({bookings.length})
          </button>
          <button
            onClick={() => setFilter('PENDING')}
            className={`px-5 py-2 rounded-full text-xs uppercase tracking-wider font-semibold transition-all cursor-pointer ${
              filter === 'PENDING'
                ? 'bg-[#00261D] text-white shadow-2xs'
                : 'bg-white text-[#717975] border border-black/10 hover:border-black/30'
            }`}
          >
            Pending Review ({bookings.filter((b) => b.payment_status === 'PROOF_UPLOADED').length})
          </button>
          <button
            onClick={() => setFilter('VERIFIED')}
            className={`px-5 py-2 rounded-full text-xs uppercase tracking-wider font-semibold transition-all cursor-pointer ${
              filter === 'VERIFIED'
                ? 'bg-[#00261D] text-white shadow-2xs'
                : 'bg-white text-[#717975] border border-black/10 hover:border-black/30'
            }`}
          >
            Verified ({bookings.filter((b) => b.payment_status === 'VERIFIED').length})
          </button>
          <button
            onClick={() => setFilter('REJECTED')}
            className={`px-5 py-2 rounded-full text-xs uppercase tracking-wider font-semibold transition-all cursor-pointer ${
              filter === 'REJECTED'
                ? 'bg-[#00261D] text-white shadow-2xs'
                : 'bg-white text-[#717975] border border-black/10 hover:border-black/30'
            }`}
          >
            Rejected ({bookings.filter((b) => b.payment_status === 'REJECTED').length})
          </button>
        </div>

        {/* Tour Package Filter Dropdown */}
        {uniquePackageList.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-[#717975] uppercase whitespace-nowrap">Filter Trip:</span>
            <select
              value={selectedPackageId}
              onChange={(e) => setSelectedPackageId(e.target.value)}
              className="bg-white border border-black/10 text-xs font-bold text-[#00261D] px-3.5 py-2 rounded-full shadow-2xs cursor-pointer focus:outline-none focus:border-[#00261D] max-w-xs truncate"
            >
              <option value="ALL">All Tour Packages ({uniquePackageList.length})</option>
              {uniquePackageList.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* ─── Bookings Table ───────────────────────────────────────────── */}
      {loading ? (
        <LoadingSpinner text="Fetching bookings and payment slips..." />
      ) : filteredBookings.length === 0 ? (
        <EmptyState
          title="No Bookings Found"
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
                {filteredBookings.map((b) => {
                  const placeholderNames = ['traveler', 'friday traveler', 'anonymous traveler', 'anonymous', 'user', 'guest', 'none', 'null', 'undefined', ''];
                  const rawName = (b.traveler_name || b.user_name || '').trim();
                  const isPlaceholder = !rawName || placeholderNames.includes(rawName.toLowerCase());
                  let emailDerived = '';
                  if (b.traveler_email) {
                    const uname = b.traveler_email.split('@')[0];
                    const clean = uname.replace(/[._\-+]/g, ' ').replace(/[0-9]/g, '').trim();
                    if (clean) {
                      emailDerived = clean.split(' ').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
                    } else {
                      emailDerived = uname.charAt(0).toUpperCase() + uname.slice(1);
                    }
                  }
                  const travelerName = (!isPlaceholder && rawName) ? rawName : (emailDerived || 'Verified Traveler');
                  return (
                    <tr key={b.id} className="hover:bg-[#F8FAF6] transition-colors">
                      <td className="py-4 px-6 font-bold text-[#00261D]">
                        <div className="flex items-center gap-3">
                          {b.traveler_profile_picture ? (
                            <img
                              src={b.traveler_profile_picture}
                              alt={travelerName}
                              className="w-9 h-9 rounded-full object-cover border border-black/10 shrink-0"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-[#00261D] flex items-center justify-center text-white text-sm font-bold shrink-0">
                              {travelerName.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div>
                            <p className="font-bold text-[#00261D]">{travelerName}</p>
                            {b.traveler_email && (
                              <p className="text-[10px] text-[#717975] font-normal">{b.traveler_email}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6 max-w-xs truncate font-medium text-[#00261D]">
                        {b.package_title}
                      </td>
                      <td className="py-4 px-6 text-[#717975]">{b.travelers} Seats</td>
                      <td className="py-4 px-6 font-bold font-mono text-[#00261D]">
                        PKR {Number(b.total_price || 0).toLocaleString()}
                      </td>
                      <td className="py-4 px-6">
                        {b.payment_proof_url ? (
                          <button
                            onClick={() => {
                              setSelectedBooking(b);
                              setProofModalOpen(true);
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-[#E7E9E5] text-[#00261D] hover:bg-[#00261D] hover:text-white transition-all cursor-pointer shadow-2xs"
                          >
                            <Eye className="w-3.5 h-3.5" /> View Slip
                          </button>
                        ) : (
                          <span className="text-[11px] text-[#717975]">No slip uploaded</span>
                        )}
                      </td>
                      <td className="py-4 px-6">
                        <span
                          className={`inline-block px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            b.payment_status === 'VERIFIED'
                              ? 'bg-emerald-100 text-emerald-900'
                              : b.payment_status === 'PROOF_UPLOADED'
                              ? 'bg-amber-100 text-amber-900 animate-pulse'
                              : b.payment_status === 'REJECTED'
                              ? 'bg-red-100 text-red-900'
                              : 'bg-slate-100 text-[#717975]'
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
                            className="px-4 py-1.5 rounded-full bg-[#00261D] hover:bg-[#00261D]/90 text-white text-[11px] font-bold uppercase tracking-wider transition-all cursor-pointer disabled:opacity-50 shadow-2xs"
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
                            className="px-3 py-1.5 rounded-full border border-red-200 text-red-700 text-[11px] font-bold uppercase tracking-wider hover:bg-red-50 transition-colors cursor-pointer"
                          >
                            Reject
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setBookingToDelete(b);
                            setDeleteModalOpen(true);
                          }}
                          disabled={processingAction}
                          className="p-1.5 rounded-full text-red-600 hover:bg-red-50 hover:text-red-800 transition-colors cursor-pointer inline-flex items-center justify-center align-middle"
                          title="Delete Reservation"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── Slip Preview Modal ─────────────────────────────────────────── */}
      {proofModalOpen && selectedBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs" onClick={() => setProofModalOpen(false)} />
          <div className="relative bg-white rounded-3xl max-w-lg w-full p-6 space-y-6 z-10 border border-black/10 shadow-2xl">
            <div className="flex justify-between items-center border-b border-black/10 pb-4">
              <h3 className="text-xl font-normal text-[#00261D]" style={{ fontFamily: "'Instrument Serif', serif" }}>
                Payment Slip — {selectedBooking.user_name}
              </h3>
              <button onClick={() => setProofModalOpen(false)} className="p-1.5 rounded-full hover:bg-black/5 text-[#717975] cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="max-h-[400px] overflow-auto rounded-2xl border border-black/10 bg-[#F8FAF6] flex items-center justify-center p-2">
              <img
                src={selectedBooking.payment_proof_url}
                alt="Payment Transaction Slip"
                className="max-h-[380px] w-auto object-contain rounded-xl"
              />
            </div>

            <div className="flex justify-between items-center pt-2">
              <span className="text-xs font-bold text-[#00261D] font-mono">
                Amount: PKR {Number(selectedBooking.total_price || 0).toLocaleString()}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => handleVerifyPayment(selectedBooking.id)}
                  disabled={processingAction}
                  className="px-6 py-2.5 rounded-full bg-[#00261D] hover:bg-[#00261D]/90 text-white text-xs font-bold uppercase tracking-wider cursor-pointer shadow-xs"
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

      {/* ─── Delete Confirmation Modal ───────────────────────────────────── */}
      {deleteModalOpen && bookingToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs" onClick={() => !processingAction && setDeleteModalOpen(false)} />
          <div className="relative bg-white rounded-3xl max-w-md w-full p-6 space-y-6 z-10 border border-black/10 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center border-b border-black/10 pb-4">
              <div className="flex items-center gap-2.5 text-red-600">
                <div className="w-9 h-9 rounded-full bg-red-50 flex items-center justify-center">
                  <Trash2 className="w-4.5 h-4.5" />
                </div>
                <h3 className="text-xl font-normal text-[#00261D]" style={{ fontFamily: "'Instrument Serif', serif" }}>
                  Delete Booking Reservation
                </h3>
              </div>
              <button
                onClick={() => setDeleteModalOpen(false)}
                disabled={processingAction}
                className="p-1.5 rounded-full hover:bg-black/5 text-[#717975] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-[#5C6661]">
              <p>
                Are you sure you want to delete the booking reservation for <strong className="text-[#00261D]">{bookingToDelete.user_name || 'Traveler'}</strong> for <strong className="text-[#00261D]">{bookingToDelete.package_title}</strong>?
              </p>
              <div className="p-3.5 bg-red-50/70 border border-red-200 rounded-2xl space-y-1 text-red-950 font-medium">
                <p>• Seats Reserved: <strong>{bookingToDelete.travelers} Seat(s)</strong></p>
                <p>• Amount: <strong>PKR {Number(bookingToDelete.total_price || 0).toLocaleString()}</strong></p>
                <p>• Status: <strong>{bookingToDelete.payment_status || 'PENDING'}</strong></p>
              </div>
              <p className="text-[11px] text-[#717975]">
                This will permanently remove the reservation and release the held seats back to your tour capacity.
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setDeleteModalOpen(false)}
                disabled={processingAction}
                className="px-5 py-2.5 rounded-full border border-black/10 text-xs font-semibold hover:bg-black/5 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteBooking}
                disabled={processingAction}
                className="px-6 py-2.5 rounded-full bg-red-600 hover:bg-red-700 text-white text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow-xs flex items-center gap-2"
              >
                {processingAction ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Deleting...
                  </>
                ) : (
                  'Yes, Delete Reservation'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

