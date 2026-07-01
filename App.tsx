import { useState, useEffect } from 'react';
import { PlayerApp } from './components/PlayerApp';
import { AdminPanel } from './components/AdminPanel';
import { auth, ADMIN_UIDS } from './firebase';

export default function App() {
  const [view, setView] = useState<'player' | 'admin'>('player');
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentUserEmail, setCurrentUserEmail] = useState('');

  useEffect(() => {
    const unsub = auth.onAuthStateChanged((user) => {
      if (user) {
        setCurrentUserEmail(user.email || '');
        const hasAdminRights = ADMIN_UIDS.includes(user.uid) || user.email === 'admin@arenax.com' || (user.email && user.email.includes('kpllahore'));
        setIsAdmin(hasAdminRights);
      } else {
        setIsAdmin(false);
        setCurrentUserEmail('');
      }
    });
    return () => unsub();
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0c12]">
      {view === 'player' ? (
        <PlayerApp
          onSwitchToAdmin={() => setView('admin')}
          isAdminUID={isAdmin}
        />
      ) : (
        <AdminPanel
          onSwitchToPlayer={() => setView('player')}
          adminEmail={currentUserEmail}
        />
      )}
    </div>
  );
}
