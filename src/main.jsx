import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { PrivyProvider, usePrivy, usePasswordlessAuth } from '@privy-io/react-auth';

// Ton App ID unique[cite: 2]
const PRIVY_APP_ID = "cmqollwmd000s0cky0evrjnkd"; 

function KoppiApp() {
  const { authenticated, user, logout } = usePrivy();
  const { initLoginWithCode, loginWithCode } = usePasswordlessAuth();
  
  const [view, setView] = useState('landing'); // 'landing' ou 'portal'
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState('email'); // 'email' ou 'otp'
  const [status, setStatus] = useState('');

  // 🚀 ACTION 1 : Envoi du mail directement par Privy (Zéro backend, Zéro redirection)
  const handleSendCode = async () => {
    if (!email.includes('@')) return;
    setStatus("Sending...");
    try {
      await initLoginWithCode({ email: email.trim().toLowerCase() });
      setStep('otp');
      setStatus("Code sent to your inbox.");
    } catch (err) {
      setStatus("Error sending code. Try again.");
    }
  };

  // 🚀 ACTION 2 : Vérification du code OTP
  const handleVerifyCode = async () => {
    if (code.length !== 6) return;
    setStatus("Verifying...");
    try {
      await loginWithCode({ email: email.trim().toLowerCase(), code: code.trim() });
    } catch (err) {
      setStatus("Invalid code.");
    }
  };

  if (view === 'landing') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', justifyContent: 'space-between' }}>
        <nav style={{ width: '100%', height: '80px', background: 'rgba(244,245,247,0.85)', backdropFilter: 'blur(20px)', position: 'fixed', top: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 40px', borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
          <div style={{ letterSpacing: '4px', textTransform: 'uppercase', fontWeight: 'bold' }}>Koppi</div>
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
          <h2 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '8px' }}>Connect to Koppi</h2>
          <p style={{ fontSize: '13px', color: '#888', marginBottom: '24px' }}>Verify your account via an operational security e-mail code.</p>
          
          {step === 'email' ? (
            <div>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} style={{ width: '100%', height: '50px', background: 'rgba(0,0,0,0.03)', border: '1px solid transparent', borderRadius: '12px', padding: '0 16px', fontSize: '14px', marginBottom: '12px', textAlign: 'center', outline: 'none' }} placeholder="Enter your email address" />
              <button onClick={handleSendCode} style={{ width: '100%', height: '50px', background: '#020202', color: '#fff', fontSize: '13px', fontWeight: '700', borderRadius: '25px', border: 'none', cursor: 'pointer', textTransform: 'uppercase' }}>Continue</button>
            </div>
          ) : (
            <div>
              <input type="text" value={code} onChange={(e) => setCode(e.target.value)} maxLength="6" style={{ width: '100%', height: '50px', background: 'rgba(0,0,0,0.03)', border: '1px solid transparent', borderRadius: '12px', padding: '0 16px', fontSize: '16px', fontWeight: 'bold', letterSpacing: '4px', marginBottom: '12px', textAlign: 'center', outline: 'none' }} placeholder="000000" />
              <div style={{ fontSize: '11px', color: '#888', marginBottom: '12px' }}>{status}</div>
              <button onClick={handleVerifyCode} style={{ width: '100%', height: '50px', background: '#020202', color: '#fff', fontSize: '13px', fontWeight: '700', borderRadius: '25px', border: 'none', cursor: 'pointer', textTransform: 'uppercase' }}>Verify and Connect</button>
              <button onClick={() => setStep('email')} style={{ background: 'none', border: 'none', color: '#888', fontSize: '11px', marginTop: '16px', cursor: 'pointer', textTransform: 'uppercase', fontWeight: '700' }}>Go Back</button>
            </div>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          <div style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.03)', borderRadius: '28px', padding: '42px 32px', textAlign: 'center', boxShadow: '0 10px 40px rgba(0,0,0,0.02)' }}>
            <div style={{ fontSize: '11px', fontWeight: '700', color: '#888', textTransform: 'uppercase', marginBottom: '16px' }}>🟢 Operational</div>
            <div style={{ fontSize: '46px', fontWeight: '800', color: '#020202' }}>
              1930<span style={{ fontSize: '24px', color: '#888', verticalAlign: 'super', fontWeight: '700' }}>.50$</span>
            </div>
            <div style={{ fontFamily: 'monospace', fontSize: '11px', color: '#b1b1b1', marginTop: '8px', marginBottom: '24px' }}>
              {user?.wallet?.address ? user.wallet.address.substring(0, 8).toUpperCase() + '...' + user.wallet.address.substring(user.wallet.address.length - 8).toUpperCase() : "0xAA41C6E8...595F3523"}
            </div>
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
