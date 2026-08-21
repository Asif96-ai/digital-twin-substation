import React from 'react';

const ActionLog = ({ actions, blackoutsPrevented }) => {
  const allActions = actions || [];

  if (allActions.length === 0) {
    return (
      <div className="action-log">
        <h3>Action Log</h3>
        <div className="action-log-empty">
          <span>No actions recorded yet</span>
          <small>Actions will appear here when faults occur or operator takes action</small>
        </div>
        {blackoutsPrevented > 0 && (
          <div className="blackout-stats">
            Blackouts Prevented: <strong>{blackoutsPrevented}</strong>
          </div>
        )}
      </div>
    );
  }

  // Display newest first - reverse the array
  const displayActions = [...allActions].reverse();

  return (
    <div className="action-log">
      <h3>Action Log</h3>
      {blackoutsPrevented > 0 && (
        <div className="blackout-stats">
          Blackouts Prevented: <strong>{blackoutsPrevented}</strong>
        </div>
      )}
      <div className="action-log-list">
        {displayActions.map((action, idx) => {
          const isAI = action.type === 'AI_AUTO_CORRECTION';
          const isOperator = action.type === 'OPERATOR_ACTION';
          const hasActions = action.actions && action.actions.length > 0;
          
          return (
            <div key={idx} className={'action-log-item ' + (isAI ? 'ai-action' : 'operator-action')}>
              <div className="action-header">
                <span className="action-icon">{isAI ? 'AI' : 'OP'}</span>
                <span className="action-type">{isAI ? 'AI Auto-Correction' : 'Operator Action'}</span>
                <span className="action-time">
                  {action.logTime ? new Date(action.logTime).toLocaleTimeString() : 'N/A'}
                </span>
              </div>
              <div className="action-description">
                {isAI 
                  ? 'AI executed auto-correction protocol on ' + (action.transformer || 'system')
                  : hasActions 
                    ? 'Operator executed ' + action.actions.length + ' corrective actions on ' + (action.transformer || 'system')
                    : 'Operator acknowledged fault on ' + (action.transformer || 'system')
                }
              </div>
              <div className="action-details">
                {action.transformer && <span>Transformer: {action.transformer}</span>}
                {action.faultType && <span>Fault: {action.faultType}</span>}
                {action.severity && (
                  <span className={'severity-badge ' + action.severity.toLowerCase()}>
                    {action.severity}
                  </span>
                )}
                {hasActions && (
                  <div className="action-actions-list">
                    <strong>Actions Taken:</strong>
                    <ul>
                      {action.actions.map((a, i) => (
                        <li key={i}>{a}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {isAI && action.description && !hasActions && (
                  <div className="action-actions-list ai-description">
                    <strong>Protocol:</strong>
                    <p>{action.description}</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ActionLog;