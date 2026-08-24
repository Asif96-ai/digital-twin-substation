import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import Substation3D from './components/Substation3D';
import Controls from './components/Controls';
import ActionLog from './components/ActionLog';
import FaultPanel from './components/FaultPanel';
import ModeToggle from './components/ModeToggle';
import Recommendations from './components/Recommendations';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import './App.css';

const SOCKET_URL = (import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000').replace(/\/$/, '');
const API_URL = `${SOCKET_URL}/api`;

function App() {
  const [socket, setSocket] = useState(null);
  const [substationData, setSubstationData] = useState(null);
  const [historicalData, setHistoricalData] = useState([]);
  const [anomalies, setAnomalies] = useState([]);
  const [aiInsights, setAiInsights] = useState([]);
  const [aiStatus, setAiStatus] = useState('Initializing...');
  const [faultData, setFaultData] = useState(null);
  const [aiActions, setAiActions] = useState([]);
  const [blackoutsPrevented, setBlackoutsPrevented] = useState(0);
  const [currentMode, setCurrentMode] = useState('manual');
  const [confidenceScore, setConfidenceScore] = useState(87);
  const [totalPower, setTotalPower] = useState(0);
  const [recommendations, setRecommendations] = useState([]);
  const [avgLoad, setAvgLoad] = useState(0);
  const [avgTemp, setAvgTemp] = useState(0);
  const [avgVoltage, setAvgVoltage] = useState(0);
  const [avgCurrent, setAvgCurrent] = useState(0);
  const [avgPowerFactor, setAvgPowerFactor] = useState(0);
  const [systemEfficiency, setSystemEfficiency] = useState(0);
  const [countdownValue, setCountdownValue] = useState(10);
  const [userActionPending, setUserActionPending] = useState(false);
  const [selectedTransformer, setSelectedTransformer] = useState('T1');

  const generateFault = async () => {
    try {
      const response = await fetch(`${API_URL}/fault/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await response.json();
      if (data.success) {
        setFaultData({ fault: data.fault });
      }
    } catch (error) {
      console.error('Error generating fault:', error);
    }
  };

  const handleUserAction = (action) => {
    console.log('User action:', action);
  };

  const handleModeToggle = (mode) => {
    setCurrentMode(mode);
  };

  const getConfidenceDescription = (score) => {
    if (score >= 90) return 'Excellent - System operating at peak performance';
    if (score >= 80) return 'Good - System stable with minor deviations';
    if (score >= 70) return 'Fair - Some parameters need attention';
    if (score >= 60) return 'Warning - Several parameters out of range';
    return 'Critical - Immediate action required';
  };

  const getConfidenceColor = (score) => {
    if (score >= 80) return '#48bb78';
    if (score >= 65) return '#ed8936';
    return '#e53e3e';
  };

  const injectFault = async (type) => {
    try {
      const response = await fetch(`${API_URL}/control/anomaly`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          type: type,
          transformer: selectedTransformer
        })
      });
      const data = await response.json();
      console.log('Fault injected:', data);
    } catch (error) {
      console.error('Error injecting fault:', error);
    }
  };

  const handleTransformerSelect = (transformerId) => {
    setSelectedTransformer(transformerId);
  };

  const handleResetComplete = (transformerId) => {
    console.log('Reset complete for ' + transformerId);
  };

  useEffect(() => {
    const newSocket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });
    
    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('✅ Socket.IO connected successfully!');
    });

    newSocket.on('connect_error', (error) => {
      console.error('❌ Socket.IO connection error:', error);
    });

    newSocket.on('disconnect', (reason) => {
      console.log('⚠️ Socket.IO disconnected:', reason);
    });

    newSocket.on('substation-update', (data) => {
      setSubstationData(data);
      setAnomalies(data.anomalies || []);
      setConfidenceScore(data.confidenceScore || 87);
      setTotalPower(data.totalPower || 0);
      setRecommendations(data.controlRecommendations || []);
      setAvgLoad(data.avgLoad || 0);
      setAvgTemp(data.avgTemp || 0);
      setAvgVoltage(data.avgVoltage || 0);
      setAvgCurrent(data.avgCurrent || 0);
      setAvgPowerFactor(data.avgPowerFactor || 0);
      setSystemEfficiency(data.systemEfficiency || 0);
      setCountdownValue(data.countdownValue || 10);
      setUserActionPending(data.userActionPending || false);
      
      if (data.fault) {
        setFaultData({ fault: data.fault });
      } else {
        setFaultData(null);
      }
      
      if (data.actionLog) {
        setAiActions(data.actionLog);
      }
      
      if (data.blackoutPrevented) {
        setBlackoutsPrevented(prev => prev + 1);
      }
      
      if (data.fault) {
        setAiStatus('Fault Active');
      } else if (data.anomalies && data.anomalies.length > 0) {
        setAiStatus('Warnings: ' + data.anomalies.length);
      } else {
        setAiStatus('System Normal');
      }
      
      setHistoricalData(prev => {
        if (!data.transformers || data.transformers.length === 0) return prev;
        const avgLoad = data.transformers.reduce((sum, t) => sum + t.load, 0) / data.transformers.length;
        const avgTemp = data.transformers.reduce((sum, t) => sum + t.temperature, 0) / data.transformers.length;
        const newData = [...prev, {
          timestamp: new Date(data.timestamp).toLocaleTimeString(),
          load: Math.round(avgLoad),
          temperature: Math.round(avgTemp),
          voltage: data.avgVoltage || 0,
          current: data.avgCurrent || 0,
          confidence: data.confidenceScore || 87
        }];
        return newData.slice(-20);
      });
    });

    newSocket.on('ai-insights', (insights) => {
      setAiInsights(insights || []);
    });

    return () => {
      newSocket.close();
    };
  }, []);

  return (
    <div className="App">
      <header className="App-header">
        <div className="header-left">
          <h1>Digital Twin Substation</h1>
          <span className="ai-badge">AI-Powered</span>
        </div>
        <div className="status-bar">
          <span className="status-dot live"></span>
          <span>Live Data</span>
          <span className="status-dot" style={{ marginLeft: '20px', background: anomalies.length > 0 || faultData ? '#fc8181' : '#48bb78' }}></span>
          <span>{anomalies.length > 0 || faultData ? 'Alerts: ' + (anomalies.length + (faultData ? 1 : 0)) : 'All Normal'}</span>
          <span className="ai-status" style={{ color: faultData ? '#fc8181' : anomalies.length > 0 ? '#f6ad55' : '#48bb78' }}>
            {faultData ? 'Fault Active' : anomalies.length > 0 ? 'Warnings: ' + anomalies.length : 'System Normal'}
          </span>
          <span className="mode-badge">{currentMode === 'auto' ? 'AI Control' : 'Manual Control'}</span>
          {userActionPending && (
            <span className="countdown-badge">Action Required: {countdownValue}s</span>
          )}
        </div>
      </header>

      <div className={`anomaly-notification-bar ${anomalies.length > 0 ? 'has-anomalies' : 'no-anomalies'}`}>
        <div className="anomaly-notification-icon" style={{ background: anomalies.length > 0 ? '#fc8181' : '#48bb78' }}>
          {anomalies.length > 0 ? '!' : '✓'}
        </div>
        <div className="anomaly-notification-content">
          {anomalies.length === 0 ? (
            <>
              <span className="anomaly-notification-label" style={{ color: '#48bb78' }}>System Status:</span>
              <span className="anomaly-notification-item" style={{ borderColor: '#48bb78', color: '#48bb78' }}>
                All systems operating normally
              </span>
            </>
          ) : (
            <>
              <span className="anomaly-notification-label" style={{ color: '#fc8181' }}>Active Anomalies ({anomalies.length}):</span>
              {anomalies.slice(0, 3).map((anomaly, idx) => (
                <span key={idx} className="anomaly-notification-item">
                  <strong>{anomaly.source}:</strong> {anomaly.type}
                </span>
              ))}
              {anomalies.length > 3 && (
                <span className="anomaly-notification-more">+{anomalies.length - 3} more</span>
              )}
            </>
          )}
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="card full-width">
          <ModeToggle currentMode={currentMode} onModeToggle={handleModeToggle} />
        </div>

        <div className="card full-width">
          <h3>System Overview</h3>
          <div className="system-overview-grid">
            <div className="overview-item">
              <label>Total Power</label>
              <span>{totalPower} kW</span>
            </div>
            <div className="overview-item">
              <label>Avg Load</label>
              <span>{avgLoad}%</span>
            </div>
            <div className="overview-item">
              <label>Avg Temperature</label>
              <span>{avgTemp}°C</span>
            </div>
            <div className="overview-item">
              <label>Avg Voltage</label>
              <span>{avgVoltage} kV</span>
            </div>
            <div className="overview-item">
              <label>Avg Current</label>
              <span>{avgCurrent} A</span>
            </div>
            <div className="overview-item">
              <label>Avg Power Factor</label>
              <span>{avgPowerFactor}</span>
            </div>
            <div className="overview-item">
              <label>System Efficiency</label>
              <span>{systemEfficiency}%</span>
            </div>
            <div className="overview-item">
              <label>AI Confidence</label>
              <span>{confidenceScore}%</span>
            </div>
            <div className="overview-item">
              <label>Active Faults</label>
              <span className={faultData ? 'warning' : 'normal'}>
                {faultData ? 'Active' : 'None'}
              </span>
            </div>
          </div>
        </div>

        <div className="card">
          <h3>3D Substation View</h3>
          <div className="three-container">
            <Substation3D data={substationData} />
          </div>
        </div>

        <div className="card">
          <h3>AI Insights</h3>
          <div className="ai-insights-container">
            {aiInsights.length > 0 ? (
              <div className="ai-insights-list">
                {aiInsights.map((insight, idx) => (
                  <div key={idx} className={'ai-insight-bubble' + (insight.includes('ACTIVE FAULT') ? ' warning' : '')}>
                    <span className="insight-text">{insight}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="ai-loading">
                <div className="ai-spinner"></div>
                <p>Analyzing system...</p>
              </div>
            )}
          </div>
          <div className="ai-confidence">
            <span>AI Confidence: </span>
            <div className="confidence-bar">
              <div 
                className="confidence-fill" 
                style={{ 
                  width: confidenceScore + '%',
                  background: getConfidenceColor(confidenceScore)
                }}
              />
            </div>
            <span className="confidence-label">{confidenceScore}%</span>
          </div>
          <div className="confidence-description">
            <span className="confidence-status" style={{ color: getConfidenceColor(confidenceScore) }}>
              ● {getConfidenceDescription(confidenceScore)}
            </span>
          </div>
        </div>

        {currentMode === 'manual' && (
          <div className="card full-width controls-wrapper">
            <div className="controls-left">
              <Controls 
                onTransformerSelect={handleTransformerSelect}
                onResetComplete={handleResetComplete}
              />
            </div>
            <div className="controls-right">
              <div className="manual-fault-injection">
                <h4>Manual Fault Injection</h4>
                <p className="fault-injection-desc">Inject simulated faults to test system response on <strong>{selectedTransformer}</strong></p>
                <div className="fault-buttons">
                  <button onClick={() => injectFault('overload')} className="btn btn-danger">
                    Overload
                  </button>
                  <button onClick={() => injectFault('overheat')} className="btn btn-warning">
                    Overheat
                  </button>
                  <button onClick={() => injectFault('critical')} className="btn btn-critical">
                    Critical Fault
                  </button>
                  <button onClick={() => injectFault('random')} className="btn btn-info">
                    Random
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {currentMode === 'manual' && (
          <div className="card full-width">
            <Recommendations recommendations={recommendations} />
          </div>
        )}

        <div className="card full-width">
          <FaultPanel 
            faultData={faultData} 
            onGenerateFault={generateFault}
            onUserAction={handleUserAction}
            currentMode={currentMode}
            countdownValue={countdownValue}
            userActionPending={userActionPending}
          />
        </div>

        <div className="card full-width">
          <h3>System Performance Trends</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={historicalData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="timestamp" />
              <YAxis yAxisId="left" domain={[0, 100]} label={{ value: 'Load % / Temp °C', angle: -90, position: 'insideLeft', style: { fill: '#a0aec0', fontSize: '10px' } }} />
              <YAxis yAxisId="right" orientation="right" domain={[0, 100]} label={{ value: 'Confidence %', angle: 90, position: 'insideRight', style: { fill: '#a0aec0', fontSize: '10px' } }} />
              <Tooltip />
              <Legend />
              <Line yAxisId="left" type="monotone" dataKey="load" stroke="#8884d8" name="Load %" strokeWidth={2} dot={false} />
              <Line yAxisId="left" type="monotone" dataKey="temperature" stroke="#82ca9d" name="Temp °C" strokeWidth={2} dot={false} />
              <Line yAxisId="right" type="monotone" dataKey="confidence" stroke="#ff7300" name="Confidence %" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
          <div className="chart-legend">
            <span className="legend-item"><span className="legend-color" style={{ background: '#8884d8' }}></span> Average Load</span>
            <span className="legend-item"><span className="legend-color" style={{ background: '#82ca9d' }}></span> Average Temperature</span>
            <span className="legend-item"><span className="legend-color" style={{ background: '#ff7300' }}></span> AI Confidence</span>
          </div>
        </div>

        <div className="card full-width">
          <h3>Transformer Status</h3>
          <div className="transformer-status-wrapper">
            {substationData && substationData.transformers?.map((t, idx) => (
              <div key={idx} className="transformer-status-item">
                <div className="transformer-status-header">
                  <span className="transformer-id">{t.id}</span>
                  <span className="transformer-location">{t.location}</span>
                  <span className={'transformer-status-dot ' + (t.load > 80 || t.temperature > 75 ? 'warning' : 'healthy')}>
                    {t.load > 80 || t.temperature > 75 ? '!' : 'OK'}
                  </span>
                </div>
                <div className="transformer-status-bars">
                  <div className="status-bar-item">
                    <span>Load: {Math.round(t.load)}%</span>
                    <div className="mini-bar">
                      <div className="mini-bar-fill" style={{ width: t.load + '%', background: t.load > 80 ? '#e53e3e' : '#48bb78' }} />
                    </div>
                  </div>
                  <div className="status-bar-item">
                    <span>Temp: {Math.round(t.temperature)}°C</span>
                    <div className="mini-bar">
                      <div className="mini-bar-fill" style={{ width: (t.temperature / 100) * 100 + '%', background: t.temperature > 75 ? '#e53e3e' : '#48bb78' }} />
                    </div>
                  </div>
                  <div className="status-bar-item">
                    <span>Voltage: {t.voltage} kV</span>
                    <div className="mini-bar">
                      <div className="mini-bar-fill" style={{ width: ((t.voltage - 10) / 1.5) * 100 + '%', background: t.voltage < 10.5 ? '#e53e3e' : '#48bb78' }} />
                    </div>
                  </div>
                  <div className="status-bar-item">
                    <span>Current: {t.current} A</span>
                    <div className="mini-bar">
                      <div className="mini-bar-fill" style={{ width: (t.current / 200) * 100 + '%', background: t.current > 150 ? '#e53e3e' : '#48bb78' }} />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card full-width">
          <ActionLog actions={aiActions} blackoutsPrevented={blackoutsPrevented} />
        </div>
      </div>
    </div>
  );
}

export default App;