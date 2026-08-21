import React, { useState, useEffect } from 'react';

const FaultPanel = ({ faultData, onGenerateFault, onUserAction, currentMode, countdownValue, userActionPending }) => {
  const [userResponded, setUserResponded] = useState(false);
  const [autoActionTaken, setAutoActionTaken] = useState(false);
  const [actionTakenMessage, setActionTakenMessage] = useState('');
  const [operatorActions, setOperatorActions] = useState([]);

  useEffect(() => {
    if (!faultData || !faultData.fault) {
      setUserResponded(false);
      setAutoActionTaken(false);
      setActionTakenMessage('');
      setOperatorActions([]);
    }
  }, [faultData]);

  const handleUserAction = (action) => {
    setUserResponded(true);
    
    if (action === 'acknowledge') {
      const fault = faultData?.fault;
      const actionsList = [];
      
      const faultTypeActions = {
        'Line to Line Fault': [
          'Isolate both affected phases via circuit breaker',
          'Check for conductor contact',
          'Verify protection relay settings'
        ],
        'Single Line to Ground Fault': [
          'Isolate affected phase using SCADA remote control',
          'Check grounding system resistance',
          'Inspect insulators for damage'
        ],
        'Double Line to Ground Fault': [
          'Isolate all affected phases immediately',
          'Check grounding system integrity',
          'Inspect transformer protection'
        ],
        'Three Phase Fault': [
          'Trip all phases - Immediate isolation required',
          'Check circuit breaker operation',
          'Inspect for equipment failure'
        ],
        'Open Circuit Fault': [
          'Locate break point using TDR',
          'Check connectors and joints',
          'Schedule immediate repair'
        ],
        'Overcurrent Fault': [
          'Check protection relay settings',
          'Inspect circuit breaker operation',
          'Verify cable ratings'
        ],
        'Overvoltage Fault': [
          'Check voltage regulator operation',
          'Verify tap changer position',
          'Inspect surge protection'
        ]
      };
      
      const baseActions = faultTypeActions[fault?.type] || [
        'Inspect system and isolate fault',
        'Follow IEC 61850 protocol'
      ];
      
      baseActions.forEach((actionText, index) => {
        actionsList.push('Step ' + (index + 1) + ': ' + actionText);
      });
      
      let stepCount = actionsList.length + 1;
      
      if (fault?.parameterChanges?.load > 85) {
        actionsList.push('Step ' + stepCount + ': Reduce load by 20% on ' + fault.transformer);
        stepCount++;
      }
      
      if (fault?.parameterChanges?.temperature > 80) {
        actionsList.push('Step ' + stepCount + ': Check cooling system on ' + fault.transformer);
        stepCount++;
      }
      
      if (fault?.parameterChanges?.voltage < 10.5) {
        actionsList.push('Step ' + stepCount + ': Check voltage regulator on ' + fault.transformer);
        stepCount++;
      }
      
      if (fault?.parameterChanges?.current > 150) {
        actionsList.push('Step ' + stepCount + ': Check overload protection on ' + fault.transformer);
        stepCount++;
      }
      
      setOperatorActions(actionsList);
      setActionTakenMessage('Operator executed ' + actionsList.length + ' corrective actions');
      
      fetch('http://localhost:5000/api/fault/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'acknowledge',
          actions: actionsList 
        })
      });
    } else {
      // AI action (from timer or "Let AI Handle" button)
      setAutoActionTaken(true);
      setActionTakenMessage('AI executed auto-correction protocol');
      
      fetch('http://localhost:5000/api/fault/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'auto' })
      });
    }
    
    if (onUserAction) {
      onUserAction(action);
    }
  };

  if (!faultData || !faultData.fault) {
    return (
      <div className="fault-panel">
        <h3>Fault Detection System</h3>
        <div className="fault-status healthy">
          <span className="status-icon">●</span>
          <span>System Healthy - No Active Faults</span>
        </div>
        <div className="fault-info">
          <span>Mode: <strong>{currentMode === 'auto' ? 'AI Auto-Control' : 'Operator Control'}</strong></span>
          <span>Status: <strong>Monitoring</strong></span>
          {currentMode === 'auto' && <span>Next fault in ~3 minutes</span>}
        </div>
        {currentMode === 'manual' && (
          <button 
            onClick={() => onGenerateFault && onGenerateFault()} 
            className="btn btn-primary"
          >
            Generate Test Fault
          </button>
        )}
      </div>
    );
  }

  const fault = faultData.fault;
  const isCritical = fault.severity === 'Critical';
  const showUserAction = fault.requiresUserAction && !userResponded && fault.status === 'Active' && userActionPending;

  return (
    <div className="fault-panel">
      <h3>Active Fault Detected</h3>
      
      <div className={'fault-alert ' + (isCritical ? 'critical' : 'warning')}>
        <div className="fault-header">
          <span className="fault-icon">{isCritical ? '!' : 'i'}</span>
          <span className="fault-type">{fault.type}</span>
          <span className={'fault-severity ' + (fault.severity || 'warning').toLowerCase()}>
            {fault.severity}
          </span>
          <span className="fault-iec">{fault.iecClassification}</span>
        </div>
        
        <div className="fault-description">
          <p>{fault.severityDescription}</p>
        </div>

        <div className="fault-details-grid">
          <div className="fault-detail">
            <label>Location</label>
            <span>{fault.transformer} at {fault.location}</span>
          </div>
          <div className="fault-detail">
            <label>Distance</label>
            <span>{fault.distance} km on {fault.feeder}</span>
          </div>
          <div className="fault-detail">
            <label>Time</label>
            <span>{new Date(fault.timestamp).toLocaleTimeString()}</span>
          </div>
          <div className="fault-detail">
            <label>Load Change</label>
            <span>+{Math.round(fault.parameterChanges?.load - 65 || 0)}%</span>
          </div>
          <div className="fault-detail">
            <label>Temp Change</label>
            <span>+{Math.round(fault.parameterChanges?.temperature - 60 || 0)}°C</span>
          </div>
          <div className="fault-detail">
            <label>Voltage</label>
            <span>{fault.parameterChanges?.voltage || 'N/A'} kV</span>
          </div>
          <div className="fault-detail">
            <label>Current</label>
            <span>{fault.parameterChanges?.current || 'N/A'} A</span>
          </div>
        </div>

        {fault.recommendations && (
          <div className="fault-recommendations">
            <h4>AI Recommendations (IEC 61850)</h4>
            <ul>
              {fault.recommendations.actions.map((rec, idx) => (
                <li key={idx}>{rec}</li>
              ))}
            </ul>
            <div className="iec-reference">
              {fault.recommendations.iecReference}
            </div>
          </div>
        )}

        {showUserAction && (
          <div className="fault-user-action">
            <p>
              Operator action required within <strong>{countdownValue || 10} seconds</strong>
            </p>
            <div className="action-buttons">
              <button 
                onClick={() => handleUserAction('acknowledge')}
                className="btn btn-success"
              >
                Acknowledge & Take Action
              </button>
              <button 
                onClick={() => handleUserAction('auto')}
                className="btn btn-warning"
              >
                Let AI Handle
              </button>
            </div>
            <div className="action-note">
              {currentMode === 'manual' 
                ? 'You are in operator control mode. AI will assist if you choose.' 
                : 'AI is in control. You can override by taking action.'}
            </div>
          </div>
        )}

        {autoActionTaken && fault.autoAction && (
          <div className="fault-auto-action">
            <h4>AI Auto-Correction Executed</h4>
            <p>{fault.autoAction.description}</p>
            <div className="auto-details">
              <span>Protocol: {fault.autoAction.iecReference}</span>
              <span>Executed: {new Date(fault.autoAction.timestamp).toLocaleTimeString()}</span>
            </div>
            <div className="action-result">
              <span className="result-success">✓ {actionTakenMessage}</span>
            </div>
          </div>
        )}

        {userResponded && !autoActionTaken && (
          <div className="fault-user-responded">
            <span className="user-action-icon">✓</span>
            <div className="user-action-content">
              <strong>Operator acknowledged fault and took action</strong>
              <p>{actionTakenMessage}</p>
              {operatorActions.length > 0 && (
                <div className="operator-actions-list">
                  <strong>Actions Executed:</strong>
                  <ul>
                    {operatorActions.map((actionText, idx) => (
                      <li key={idx}>{actionText}</li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="operator-instructions">
                Manual intervention completed. System will auto-resolve in 3 seconds.
              </div>
            </div>
          </div>
        )}

        <div className="fault-status-bar">
          <span className="fault-id">ID: {fault.id}</span>
          <span className={'fault-status ' + (fault.status === 'Active' ? 'active' : 'resolved')}>
            {fault.status}
          </span>
        </div>
      </div>
    </div>
  );
};

export default FaultPanel;