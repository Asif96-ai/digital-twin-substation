import React, { useState } from 'react';

const ModeToggle = ({ currentMode, onModeToggle }) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleToggle = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('http://localhost:5000/api/control/mode', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      const data = await response.json();
      if (onModeToggle) {
        onModeToggle(data.mode);
      }
    } catch (error) {
      console.error('Error toggling mode:', error);
    }
    setIsLoading(false);
  };

  return (
    <div className="mode-toggle">
      <div className="mode-display">
        <span className="mode-label">Current Mode:</span>
        <span className={'mode-status ' + (currentMode === 'auto' ? 'auto-mode' : 'manual-mode')}>
          {currentMode === 'auto' ? 'Auto-Fault' : 'Manual'}
        </span>
        <span className="mode-description">
          {currentMode === 'auto' 
            ? 'Random faults every 3 minutes. AI recommends actions and auto-corrects if no response.' 
            : 'Manual control. Use sliders to adjust parameters and test scenarios.'}
        </span>
      </div>
      <button 
        onClick={handleToggle} 
        className={'btn mode-btn ' + (currentMode === 'auto' ? 'btn-danger' : 'btn-primary')}
        disabled={isLoading}
      >
        {isLoading ? 'Switching...' : currentMode === 'auto' ? 'Switch to Manual' : 'Switch to Auto-Fault Mode'}
      </button>
    </div>
  );
};

export default ModeToggle;