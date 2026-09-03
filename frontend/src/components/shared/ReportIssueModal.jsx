import { useState } from 'react';
import {
  AlertCircle,
  X,
  Loader2,
  CheckCircle2,
  Send,
  HelpCircle,
  MessageSquare,
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { complaintsService } from '../../services/complaints';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const ISSUE_CATEGORIES = [
  { value: 'Email / Notification', label: 'Email / Notification Delivery' },
  { value: 'WhatsApp', label: 'WhatsApp Alert / Notification' },
  { value: 'Loading / Stuck', label: 'Loading State Stuck / Screen Freezing' },
  { value: 'Mobile / Responsive', label: 'Mobile / Tablet Responsive Issue' },
  { value: 'Booking', label: 'Booking / Payment Problem' },
  { value: 'Trip / Organizer', label: 'Trip Creation / Organizer Feature' },
  { value: 'Authentication', label: 'Login / Account Issue' },
  { value: 'Other', label: 'General Feedback or Other' },
];

const PAGES_LIST = [
  'Explore Feed',
  'Tour Package Detail / Booking',
  'Plan Trip (AI Generator)',
  'My Trips / Vault',
  'Organizer Workshop / Dashboard',
  'Organizer Trips / Package Form',
  'Bookings & Payments',
  'Groups & Chat',
  'Profile / Settings',
  'Other',
];

export default function ReportIssueModal({ isOpen, onClose, defaultCategory = '' }) {
  const { backendUser, firebaseUser } = useAuth();
  const userEmail = backendUser?.email || firebaseUser?.email || '';

  const [issueType, setIssueType] = useState(defaultCategory || 'Mobile / Responsive');
  const [pageFeature, setPageFeature] = useState('Explore Feed');
  const [description, setDescription] = useState('');
  const [contactEmail, setContactEmail] = useState(userEmail);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedId, setSubmittedId] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!description.trim() || description.trim().length < 5) {
      toast.error('Please describe what happened in a few words.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        issue_type: issueType,
        page_feature: pageFeature,
        description: description.trim(),
        contact_email: contactEmail.trim() || userEmail || null,
        user_id: backendUser?.id || null,
        device_info: typeof window !== 'undefined' ? `${window.innerWidth}x${window.innerHeight} (${navigator.userAgent})` : null,
      };

      const res = await complaintsService.submitComplaint(payload);
      setSubmittedId(res.report_id || 'LOGGED');
      toast.success('Report submitted successfully! Our team will investigate.');
      setDescription('');
    } catch (err) {
      console.error('Failed to submit report:', err);
      toast.error('Could not submit report right now. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setSubmittedId(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-[480px] p-5 sm:p-6 rounded-3xl bg-white border border-black/10 shadow-2xl overflow-y-auto max-h-[90vh]">
        <DialogHeader className="pb-3 border-b border-black/5 space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex items-center justify-center shrink-0">
              <AlertCircle className="w-5 h-5 text-amber-700" />
            </div>
            <div>
              <DialogTitle className="text-xl font-normal text-[#00261D]" style={{ fontFamily: "'Instrument Serif', serif" }}>
                Report an Issue or Feedback
              </DialogTitle>
              <DialogDescription className="text-xs text-[#717975]">
                Direct line to Friday engineers. We review every single report.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {submittedId ? (
          <div className="py-8 flex flex-col items-center justify-center text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-emerald-700" />
            </div>
            <h4 className="text-lg font-bold text-[#00261D]">Issue Reported Successfully!</h4>
            <p className="text-xs text-[#555E59] max-w-sm">
              Your ticket <strong className="text-[#00261D]">#{submittedId}</strong> has been sent to our admin team. Thank you for helping us make Friday better.
            </p>
            <button
              onClick={handleClose}
              className="mt-4 px-6 py-2.5 rounded-full bg-[#00261D] text-white text-xs font-bold uppercase tracking-wider cursor-pointer hover:bg-[#00261D]/90 transition-all shadow-xs"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            {/* Issue Category */}
            <div>
              <label className="block text-[10px] uppercase font-bold tracking-wider text-[#717975] mb-1">
                Issue Category *
              </label>
              <select
                value={issueType}
                onChange={(e) => setIssueType(e.target.value)}
                className="w-full p-2.5 text-xs bg-[#F8FAF6] border border-black/10 rounded-xl font-semibold text-[#00261D] focus:outline-none focus:border-[#00261D]"
              >
                {ISSUE_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Page / Feature */}
            <div>
              <label className="block text-[10px] uppercase font-bold tracking-wider text-[#717975] mb-1">
                Where did this happen?
              </label>
              <select
                value={pageFeature}
                onChange={(e) => setPageFeature(e.target.value)}
                className="w-full p-2.5 text-xs bg-[#F8FAF6] border border-black/10 rounded-xl font-semibold text-[#00261D] focus:outline-none focus:border-[#00261D]"
              >
                {PAGES_LIST.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>

            {/* Description */}
            <div>
              <label className="block text-[10px] uppercase font-bold tracking-wider text-[#717975] mb-1">
                Please describe what happened *
              </label>
              <textarea
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Example: When I clicked Confirm & Pay on my phone, the button spun and never completed, or email was not received..."
                className="w-full p-3 text-xs bg-[#F8FAF6] border border-black/10 rounded-xl font-normal text-[#00261D] focus:outline-none focus:border-[#00261D] resize-none leading-relaxed"
                required
              />
            </div>

            {/* Contact Email */}
            <div>
              <label className="block text-[10px] uppercase font-bold tracking-wider text-[#717975] mb-1">
                Your Email Address (Optional for status follow-up)
              </label>
              <input
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="you@gmail.com"
                className="w-full p-2.5 text-xs bg-[#F8FAF6] border border-black/10 rounded-xl font-normal text-[#00261D] focus:outline-none focus:border-[#00261D]"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-black/5">
              <button
                type="button"
                onClick={handleClose}
                disabled={isSubmitting}
                className="px-5 py-2.5 rounded-full border border-black/10 text-xs font-semibold text-[#717975] hover:text-black cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-2.5 rounded-full bg-[#00261D] hover:bg-[#00261D]/90 text-white text-xs font-bold uppercase tracking-wider flex items-center gap-2 cursor-pointer transition-all shadow-md active:scale-98 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Submitting...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5 text-[#BBEAD5]" />
                    <span>Submit Report</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
