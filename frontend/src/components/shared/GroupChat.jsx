import { useState, useEffect, useRef } from 'react';
import { Send, MessageSquare, Loader2, Info } from 'lucide-react';
import { groupsService } from '../../services/groups';
import { useAuth } from '../../context/AuthContext';
import MessageBubble from './MessageBubble';
import toast from 'react-hot-toast';

export default function GroupChat({ packageId, groupTitle }) {
  const { backendUser } = useAuth();
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef(null);

  const fetchMessages = async () => {
    try {
      const data = await groupsService.getGroupMessages(packageId);
      setMessages(data || []);
    } catch (err) {
      console.warn('Error fetching group messages:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 4000);
    return () => clearInterval(interval);
  }, [packageId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e) => {
    e?.preventDefault();
    if (!inputText.trim() || isSending) return;

    const textToSend = inputText.trim();
    setInputText('');
    setIsSending(true);

    try {
      const newMsg = await groupsService.sendGroupMessage(packageId, textToSend);
      setMessages((prev) => [...prev, newMsg]);
    } catch (err) {
      console.error('Send message failed:', err);
      toast.error('Failed to send message. Please try again.');
      setInputText(textToSend);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="flex flex-col h-[620px] rounded-3xl border border-black/10 bg-white shadow-sm overflow-hidden">
      {/* Chat Header */}
      <div className="px-6 py-4 border-b border-black/10 bg-[#F8FAF6] flex items-center justify-between">
        <h2 className="text-xs font-bold uppercase tracking-widest text-black">
          Community Chat
        </h2>
        <span className="text-[11px] text-[#6F6F6F]">
          {messages.length} message(s)
        </span>
      </div>

      {/* Messages Stream */}
      <div className="flex-1 p-6 overflow-y-auto space-y-4 bg-white">
        {loading ? (
          <div className="h-full flex flex-col items-center justify-center space-y-3 text-[#6F6F6F]">
            <Loader2 className="w-6 h-6 animate-spin text-black" />
            <p className="text-xs">Loading trip discussion...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center p-8 text-center space-y-3 text-[#6F6F6F]">
            <div className="w-12 h-12 rounded-2xl bg-[#F8FAF6] border border-black/10 flex items-center justify-center">
              <MessageSquare className="w-6 h-6 text-black" />
            </div>
            <h4
              className="text-2xl font-normal text-black"
              style={{ fontFamily: "'Instrument Serif', serif" }}
            >
              Start the Conversation
            </h4>
            <p className="text-xs max-w-sm" style={{ fontFamily: 'Inter, sans-serif' }}>
              Say hello to the organizer and fellow travelers, coordinate pickup locations, or ask about gear & weather!
            </p>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.sender_id === backendUser?.id ? 'justify-end' : 'justify-start'}`}
            >
              <MessageBubble
                message={msg}
                isOwnMessage={msg.sender_id === backendUser?.id}
              />
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Composer */}
      <div className="p-4 border-t border-black/10 bg-[#F8FAF6]">
        <form onSubmit={handleSendMessage} className="flex gap-2 items-center">
          <input
            placeholder="Type a message to the group..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={isSending}
            className="flex-1 bg-white border border-black/10 rounded-full px-5 py-3 text-xs text-black placeholder:text-[#6F6F6F] focus:outline-none focus:border-black"
          />
          <button
            type="submit"
            disabled={!inputText.trim() || isSending}
            className="p-3 rounded-full bg-black text-white hover:bg-slate-900 transition-all disabled:opacity-40 cursor-pointer shadow-sm"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
