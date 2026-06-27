import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { PrivyProvider, usePrivy } from '@privy-io/react-auth';
import { ethers } from 'ethers';

const PRIVY_APP_ID = "ton-privy-app-id-ici"; // Remplace par ton vrai ID Privy !

function KoppiApp() {
  const { login, logout, authenticated, user } = usePrivy();
  const [view, setView] = useState('landing'); // 'landing' ou 'portal'
  const [balance, setBalance] = useState({ int: '1930', frac: '.50' });
  const [address, setAddress] = useState('0XAA41...F532');

  useEffect(() => {
    if (authenticated && user?.wallet) {
      const addr = user.wallet.address;
      setAddress(addr.substring(0, 6).toUpperCase() + '...' + addr.substring(addr.length - 4).toUpperCase());
      // Optionnel : tu pourras brancher ton provider ethers ici pour lire le solde réel
    }
  }, [authenticated, user]);

  if (view === 'landing') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', justifyContent: 'space-between' }}>
        <nav style={{ width: '100%', height: '80px', background: 'rgba(244,245,247,0.85)', backdropFilter: 'blur(20px)', position: 'fixed', top: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 40px', borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
          <div style={{ fontMedium: 700, letterSpacing: '4px', textTransform: 'uppercase', fontWeight: 'bold' }}>Koppi</div>
          <button onClick={() => setView('portal')} style={{ height: '42px', padding: '0 24px', background: '#020202', color: '#fff', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', borderRadius: '21px', border: 'none', cursor: 'pointer' }}>Open Web App</button>
        </nav>

        <main style={{ flex: 1, maxWidth: '960px', width: '100%', margin: '0 auto', padding: '160px 24px 80px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ textAlign: 'center', maxWidth: '640px', marginBottom: '80px' }}>
            <div style={{ display: 'inline-block', background: '#fff', border: '1px solid rgba(0,0,0,0.05)', padding: '6px 14px', borderRadius: '20px', fontSize: '10px', fontWeight: '700', letterSpacing: '1.5px', textTransform: 'uppercase', color: '#888', marginBottom: '24px' }}>⚡ Live on Base Sepolia</div>
            <h1 style={{ fontSize: '48px', fontWeight: '800', letterSpacing: '-1.5px', marginBottom: '20px' }}>Make stablecoins your everyday money</h1>
            <p style={{ fontSize: '18px', color: '#666', marginBottom: '32px' }}>Access USD, buy instantly, and spend globally using secure keyless infrastructure.</p>
            <button onClick={() => setView('portal')} style={{ height: '52px', padding: '0 36px', background: '#020202', color: '#fff', fontWeight: '700', borderRadius: '26px', border: 'none', cursor: 'pointer', textTransform: 'uppercase' }}>Get Started</button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div style={{ padding: '40px 24px', maxWidth: '400px', margin: '40px auto', display: 'flex', flexDirection: 'column', gap: '40px' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontWeight: 'bold', letterSpacing: '2px', textTransform: 'uppercase', fontSize: '16px' }}>Koppi App</div>
        <button onClick={() => { if(authenticated) { logout(); location.reload(); } else { setView('landing'); } }} style={{ fontSize: '11px', fontWeight: '700', color: '#888', background: 'none', border: 'none', cursor: 'pointer', textTransform: 'uppercase' }}>
          {authenticated ? 'Disconnect' : 'Exit'}
        </button>
      </header>

      {!authenticated ? (
        <div style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.03)', borderRadius: '28px', padding: '42px 32px', textAlign: 'center', boxShadow: '0 10px 40px rgba(0,0,0,0.02)' }}>
          <h2 style={{ fontSize: '26px', fontWeight: '800', marginBottom: '10px' }}>Connect to Koppi</h2>
          <p style={{ fontSize: '13px', color: '#888', marginBottom: '32px' }}>Access your keyless operational environment securely via email verification code.</p>
          <button onClick={login} style={{ width: '100%', height: '50px', background: '#020202', color: '#fff', fontSize: '13px', fontWeight: '700', borderRadius: '25px', border: 'none', cursor: 'pointer', textTransform: 'uppercase' }}>Sign in or Register</button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          <div style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.03)', borderRadius: '28px', padding: '42px 32px', textAlign: 'center', boxShadow: '0 10px 40px rgba(0,0,0,0.02)' }}>
            <div style={{ fontSize: '11px', fontWeight: '700', color: '#888', textTransform: 'uppercase', marginBottom: '16px' }}>🟢 Account Connected</div>
            <div style={{ fontSize: '46px', fontWeight: '800', color: '#020202' }}>
              {balance.int}<span style={{ fontSize: '24px', color: '#888', verticalAlign: 'super', fontWeight: '700' }}>{balance.frac}</span>
            </div>
            <div style={{ fontFamily: 'monospace', fontSize: '11px', color: '#b1b1b1', marginTop: '8px', marginBottom: '24px' }}>{address}</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <button style={{ height: '44px', fontSize: '12px', fontWeight: '700', background: '#020202', color: '#fff', borderRadius: '12px', border: 'none', cursor: 'pointer', textTransform: 'uppercase' }}>Add Money</button>
              <button style={{ height: '44px', fontSize: '12px', fontWeight: '700', background: 'rgba(0,0,0,0.04)', color: '#020202', borderRadius: '12px', border: 'none', cursor: 'pointer', textTransform: 'uppercase' }}>Transfer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <PrivyProvider appId={PRIVY_APP_ID} config={{ loginMethods: ['email'], embeddedWallets: { createOnLogin: 'users-without-wallets' } }}>
      <KoppiApp />
    </PrivyProvider>
  </React.StrictMode>
);
