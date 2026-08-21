import React from 'react';

const Recommendations = ({ recommendations }) => {
  if (!recommendations || recommendations.length === 0) {
    return (
      <div className="recommendations-panel">
        <h3>Real-Time Recommendations</h3>
        <div className="recommendations-container">
          <div className="no-recommendations">
            <span>All transformers operating normally</span>
            <small>No recommendations at this time</small>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="recommendations-panel">
      <h3>Real-Time Recommendations</h3>
      <div className="recommendations-container">
        <div className="recommendations-list">
          {recommendations.map((rec, idx) => (
            <div key={idx} className={'recommendation-item ' + rec.severity.toLowerCase()}>
              <div className="rec-header">
                <span className="rec-transformer">{rec.transformer}</span>
                <span className={'rec-severity ' + rec.severity.toLowerCase()}>
                  {rec.severity}
                </span>
              </div>
              <div className="rec-issues">
                {rec.issues.map((issue, i) => (
                  <div key={i} className="rec-issue">{issue}</div>
                ))}
              </div>
              <div className="rec-actions">
                <strong>Actions:</strong>
                <ul>
                  {rec.actions.map((action, i) => (
                    <li key={i}>{action}</li>
                  ))}
                </ul>
              </div>
              <div className="rec-time">
                {new Date(rec.timestamp).toLocaleTimeString()}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Recommendations;