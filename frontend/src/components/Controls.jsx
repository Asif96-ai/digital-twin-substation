import React, { useState } from 'react';

const SOCKET_URL = (import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000').replace(/\/$/, '');
const API_URL = `${SOCKET_URL}/api`;

const Controls = ({ onTransformerSelect, onResetComplete }) => {
  const [selectedTransformer, setSelectedTransformer] = useState('T1');
  const [loadValue, setLoadValue] = useState(70);
  const [tempValue, setTempValue] = useState(60);
  const [message, setMessage] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  const handleTransformerChange = (e) => {
    const value = e.target.value;
    setSelectedTransformer(value);
    if (onTransformerSelect) {
      onTransformerSelect(value);
    }
    setLoadValue(70);
    setTempValue(60);
  };

  const sendControl = async () => {
    try {
      const response = await fetch(`${API_URL}/control/transformer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedTransformer,
          load: loadValue,
          temperature: tempValue
        })
      });
      const data = await response.json();
      setMessage('Success: ' + data.message);
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Control error:', error);
      setMessage('Error: Could not connect to backend');
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const resetTransformer = async () => {
    setIsResetting(true);
    try {
      const response = await fetch(`${API_URL}/control/reset/${selectedTransformer}`, {
        method: 'POST'
      });
      const data = await response.json();
      setLoadValue(70);
      setTempValue(60);
      setMessage('Success: ' + data.message);
      setTimeout(() => setMessage(''), 3000);
      if (onResetComplete) {
        onResetComplete(selectedTransformer);
      }
    } catch (error) {
      console.error('Reset error:', error);
      setMessage('Error: Could not connect to backend');
      setTimeout(() => setMessage(''), 3000);
    }
    setIsResetting(false);
  };

  return (
    <div className="controls-panel">
      <h3>Parameter Control</h3>
      <p className="control-desc">Adjust transformer parameters to simulate operational changes</p>
      
      <div className="control-group">
        <label>Transformer:</label>
        <select 
          value={selectedTransformer} 
          onChange={handleTransformerChange}
          className="control-select"
        >
          <option value="T1">Transformer T1</option>
          <option value="T2">Transformer T2</option>
          <option value="T3">Transformer T3</option>
        </select>
      </div>

      <div className="control-group">
        <label>Load: {loadValue}%</label>
        <input
          type="range"
          min="20"
          max="100"
          value={loadValue}
          onChange={(e) => setLoadValue(Number(e.target.value))}
          className="control-slider"
        />
      </div>

      <div className="control-group">
        <label>Temperature: {tempValue}°C</label>
        <input
          type="range"
          min="40"
          max="100"
          value={tempValue}
          onChange={(e) => setTempValue(Number(e.target.value))}
          className="control-slider"
        />
      </div>

      <div className="control-buttons">
        <button onClick={sendControl} className="btn btn-primary" disabled={isResetting}>
          Apply Settings
        </button>
        <button onClick={resetTransformer} className="btn btn-reset" disabled={isResetting}>
          {isResetting ? 'Resetting...' : 'Reset to Auto'}
        </button>
      </div>

      {message && <div className="control-message">{message}</div>}
    </div>
  );
};

export default Controls;