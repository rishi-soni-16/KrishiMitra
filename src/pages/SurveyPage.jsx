import React, { useState, useEffect, useTransition, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUser } from '@fortawesome/free-solid-svg-icons';
import { faMicrophone } from '@fortawesome/free-solid-svg-icons';
import { faSquareArrowUpRight } from '@fortawesome/free-solid-svg-icons';

import './SurveyPage.css';

const API_BASE = import.meta.env.VITE_KRISHI_MITRA_USER_URL;

// Spinner component
function Spinner() {
  return <div className="spinner">Loading...</div>;
}

// Error banner component
function ErrorBanner({ message }) {
  return <div className="error-banner">Error: {message}</div>;
}

// Success banner component
function SuccessBanner({ message }) {
  return <div className="success-banner">{message}</div>;
}

function SurveyPage() {
  const navigate = useNavigate(); // for redirects

  // State
  const [user, setUser] = useState(null);
  const [formData, setFormData] = useState({ farmSize: '', location: '', soilType: '', irrigationCapacity: '' });
  const [exists, setExists] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [isPending, startTransition] = useTransition();
  const [chatVisible, setChatVisible] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  const bannerRef = useRef();

  // On mount: auth & fetch
  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (!stored) {
      navigate('/');
      return;
    }
    const parsed = JSON.parse(stored);
    setUser(parsed);

    (async () => {
      try {
        setError(null);
        // check existence
        const chkRes = await fetch(`${API_BASE}/checkUser/${encodeURIComponent(parsed.email)}`);
        if (!chkRes.ok) throw new Error('Unable to check user status');
        const { exists } = await chkRes.json();
        if (exists) {
          // fetch data
          const res = await fetch(`${API_BASE}/user/${encodeURIComponent(parsed.email)}`);
          if (!res.ok) throw new Error('Failed to load user data');
          const data = await res.json();
          setFormData({
            farmSize: data.farmSize ?? '',
            location: data.location ?? '',
            soilType: data.soilType ?? '',
            irrigationCapacity: data.irrigationCapacity ?? ''
          });
          setExists(true);
          setSuccess(null);
        }
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [navigate]);

  // whenever error or success changes, auto‑dismiss after 3s
  useEffect(() => {
    if(!error && !success) return;

    const t1 = setTimeout(() => {
     bannerRef.current.classList.add('banner-hide');
    }, 3000);
    const t2 = setTimeout(() => {
      setError(null);
      setSuccess(null);
      bannerRef.current.classList.remove('banner-hide');
    }, 3800);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [error, success]);

  // Logout
  const handleLogout = () => {
    localStorage.removeItem('user');
    navigate('/');
  };

  // Input change
  const handleChange = e => {
    const { name, value, type } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'number' ? Number(value) : value }));
    setFieldErrors(prev => ({ ...prev, [name]: null }));
    setError(null);
    setSuccess(null);
  };

  // Validate fields
  const validate = () => {
    const errs = {};
    if (!formData.farmSize || formData.farmSize <= 0) errs.farmSize = 'Farm size is required and size must be > 0';
    if (!formData.location.trim()) errs.location = 'Location is required';
    if (!formData.soilType) errs.soilType = 'Select a soil type';
    if (!formData.irrigationCapacity) errs.irrigationCapacity = 'Select irrigation capacity';
    return errs;
  };

  // Submit
  const handleSubmit = e => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) {
      setFieldErrors(errs);
      return;
    }
    startTransition(async () => {
      try {
        setError(null);
        const resp = await fetch(`${API_BASE}/user`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: user.email, username: user.name, ...formData })
        });
        if (!resp.ok) throw new Error('Submit failed');
        setSuccess('Form submitted successfully!');
        setIsSubmitted(true);
      } catch (e) {
        setError(e.message);
      }
    });
  };

  // Chat controls
  const openChat = () => setChatVisible(true);
  const closeChat = () => {
    setIsClosing(true);
    setTimeout(() => { setChatVisible(false); setIsClosing(false); }, 300);
  };

  if (loading) return <Spinner />;

  return (
    <div className="survey-container" style={{ position: 'relative' }}>
      {error && <ErrorBanner ref={bannerRef} message={error} />}
      {success && <SuccessBanner ref={bannerRef} message={success} />}
      
      <button className="logout-btn" onClick={handleLogout}>Logout</button>

      <form className="survey-form" onSubmit={handleSubmit} noValidate>
        <h2>Welcome, {user.name}!!</h2>

        <label>1. Farm Size (in acres)</label>
        <input name="farmSize" type="number" value={formData.farmSize} onChange={handleChange} disabled={exists || isSubmitted} />
        {fieldErrors.farmSize && <div className="field-error">{fieldErrors.farmSize}</div>}

        <label>2. Location</label>
        <input name="location" type="text" value={formData.location} onChange={handleChange} disabled={exists || isSubmitted} />
        {fieldErrors.location && <div className="field-error">{fieldErrors.location}</div>}

        <label>3. Type of Soil</label>
        <select name="soilType" value={formData.soilType} onChange={handleChange} disabled={exists || isSubmitted}>
          <option value="">Select one</option>
          <option value="black">Black Soil</option>
          <option value="red">Red Soil</option>
          <option value="clay">Clay Soil</option>
          <option value="loamy">Loamy Soil</option>
          <option value="sandy">Sandy Soil</option>
        </select>
        {fieldErrors.soilType && <div className="field-error">{fieldErrors.soilType}</div>}

        <label>4. Irrigation Capacity</label>
        <select name="irrigationCapacity" value={formData.irrigationCapacity} onChange={handleChange} disabled={exists || isSubmitted}>
          <option value="">Select one</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
          <option value="none">No water</option>
        </select>
        {fieldErrors.irrigationCapacity && <div className="field-error">{fieldErrors.irrigationCapacity}</div>}

        <button type="submit" disabled={exists || isSubmitted || isPending}>
          {(exists || isSubmitted) ? 'Update form feature coming soon' : isPending ? 'Submitting...' : 'Submit'}
        </button>
      </form>

      {/* Chat Icon */}
      {!chatVisible && (exists || isSubmitted) && (
        <button className="chat-icon" onClick={openChat}>
          <FontAwesomeIcon icon={faUser} />
        </button>
      )}

      {/* Chat Popup */}
      {chatVisible && (
        <div className={`chatbot-popup ${isClosing ? 'fade-out' : 'fade-in'}`}>
          <button className="chat-close" onClick={closeChat}>×</button>
          <div className="chatbot-header">
            <h3>Hello {user.name} 👋</h3>
            <p>Thanks for submitting! Let’s chat about your farm.</p>
          </div>
          <div className="chatbot-footer">
            <input
              type="text"
              placeholder="Type your message..."
              className="chatbot-input"
            />
            <button className="chatbot-send">
              <FontAwesomeIcon icon={faSquareArrowUpRight} style={{color: "#ffffff",}} />
            </button>
            <button className="chatbot-mic">
              <FontAwesomeIcon icon={faMicrophone} style={{color: "#ffffff",}} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default SurveyPage;