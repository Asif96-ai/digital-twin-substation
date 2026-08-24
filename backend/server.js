const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "https://digital-twin-substation.vercel.app",
    methods: ["GET", "POST"]
  },
  transports: ['websocket', 'polling']
});

app.use(cors());
app.use(express.json());

class SubstationParameters {
  constructor() {
    this.standards = {
      voltage: { min: 10.5, max: 11.5, unit: 'kV' },
      current: { min: 0, max: 140, unit: 'A' },
      load: { min: 0, max: 75, unit: '%' },
      temperature: { min: 20, max: 70, unit: '°C' },
      power: { min: 0, max: 80, unit: '%' },
      frequency: { min: 49.5, max: 50.5, unit: 'Hz' },
      powerFactor: { min: 0.85, max: 1.0, unit: '' }
    };
  }

  generateParameters(transformerId, load, temperature) {
    const baseLoad = { T1: 65, T2: 55, T3: 45 }[transformerId] || 50;
    const currentLoad = load !== null ? load : baseLoad;
    
    return {
      voltage: this.simulateVoltage(currentLoad),
      current: this.simulateCurrent(currentLoad),
      power: this.simulatePower(currentLoad),
      frequency: this.simulateFrequency(),
      powerFactor: this.simulatePowerFactor(currentLoad)
    };
  }

  simulateVoltage(load) {
    const base = 11.0;
    const drop = (load / 100) * 0.3;
    return parseFloat((base - drop + (Math.random() - 0.5) * 0.2).toFixed(2));
  }

  simulateCurrent(load) {
    const base = 80;
    const increase = (load / 100) * 70;
    return Math.round(base + increase + (Math.random() - 0.5) * 10);
  }

  simulatePower(load) {
    const base = 50;
    const increase = (load / 100) * 35;
    return Math.round(Math.min(100, base + increase + (Math.random() - 0.5) * 5));
  }

  simulateFrequency() {
    return parseFloat((50 + (Math.random() - 0.5) * 0.3).toFixed(2));
  }

  simulatePowerFactor(load) {
    const base = 0.95;
    const decrease = (load / 100) * 0.15;
    return parseFloat(Math.max(0.8, base - decrease + (Math.random() - 0.5) * 0.05).toFixed(3));
  }

  getParameterStatus(paramName, value) {
    const standard = this.standards[paramName];
    if (!standard) return { status: 'Unknown', color: '#718096' };
    
    if (value < standard.min) {
      return { status: 'Low', color: '#ed8936' };
    }
    if (value > standard.max) {
      return { status: 'High', color: '#e53e3e' };
    }
    return { status: 'Normal', color: '#48bb78' };
  }
}

class AIEngine {
  constructor() {
    this.blackoutsPrevented = 0;
    this.confidenceScore = 87;
    this.actionLog = [];
    this.anomalyLog = [];
    this.countdownInterval = null;
    this.paramEngine = new SubstationParameters();
    this.countdownValue = 10;
    this.userActionPending = false;
    this.faultData = null;
    this.faultActive = false;
    this.faultResolveTimer = null;
    this.operatorActionTaken = false;
  }

  generateControlRecommendations(transformerData) {
    const recommendations = [];
    
    transformerData.forEach(t => {
      const issues = [];
      const actions = [];
      
      if (t.load > 75) {
        issues.push(t.id + ': Load High (' + Math.round(t.load) + '%)');
        actions.push('Reduce load on ' + t.id + ' by 15-20%');
      } else if (t.load > 65) {
        issues.push(t.id + ': Load Elevated (' + Math.round(t.load) + '%)');
        actions.push('Monitor load on ' + t.id);
      }
      
      if (t.temperature > 70) {
        issues.push(t.id + ': Temperature High (' + Math.round(t.temperature) + '°C)');
        actions.push('Check cooling system on ' + t.id);
      } else if (t.temperature > 60) {
        issues.push(t.id + ': Temperature Elevated (' + Math.round(t.temperature) + '°C)');
        actions.push('Monitor temperature on ' + t.id);
      }
      
      if (t.voltage < 10.5) {
        issues.push(t.id + ': Voltage Low (' + t.voltage + ' kV)');
        actions.push('Check voltage regulator on ' + t.id);
      } else if (t.voltage > 11.5) {
        issues.push(t.id + ': Voltage High (' + t.voltage + ' kV)');
        actions.push('Adjust tap changer on ' + t.id);
      }
      
      if (t.current > 140) {
        issues.push(t.id + ': Current High (' + t.current + ' A)');
        actions.push('Check overload protection on ' + t.id);
      } else if (t.current > 120) {
        issues.push(t.id + ': Current Elevated (' + t.current + ' A)');
        actions.push('Monitor current on ' + t.id);
      }
      
      if (t.powerFactor < 0.85) {
        issues.push(t.id + ': Power Factor Low (' + t.powerFactor + ')');
        actions.push('Check power factor correction on ' + t.id);
      }
      
      if (issues.length > 0) {
        recommendations.push({
          transformer: t.id,
          issues: issues,
          actions: actions.length > 0 ? actions : ['Monitor parameters closely'],
          severity: issues.some(i => i.includes('High') || i.includes('Low')) ? 'Warning' : 'Info',
          timestamp: new Date().toISOString()
        });
      }
    });
    
    return recommendations;
  }

  generateFault(transformerId, type) {
    const faultTypes = [
      'Single Line to Ground Fault',
      'Line to Line Fault',
      'Double Line to Ground Fault',
      'Three Phase Fault',
      'Open Circuit Fault',
      'Overcurrent Fault',
      'Overvoltage Fault'
    ];
    
    const locations = ['Bay A', 'Bay B', 'Bay C'];
    const transformers = ['T1', 'T2', 'T3'];
    
    const targetTransformer = transformerId || transformers[Math.floor(Math.random() * transformers.length)];
    const faultType = type || faultTypes[Math.floor(Math.random() * faultTypes.length)];
    
    const loadIncrease = 20 + Math.random() * 25;
    const tempIncrease = 15 + Math.random() * 25;
    
    const faultData = {
      id: 'F' + Date.now(),
      type: faultType,
      location: locations[Math.floor(Math.random() * locations.length)],
      transformer: targetTransformer,
      timestamp: new Date().toISOString(),
      distance: (0.5 + Math.random() * 4).toFixed(1),
      feeder: 'F' + (Math.floor(Math.random() * 4) + 1),
      status: 'Active',
      requiresUserAction: true,
      userActionWindow: 10,
      parameterChanges: {
        load: Math.min(100, 65 + loadIncrease),
        temperature: Math.min(100, 60 + tempIncrease),
        voltage: parseFloat((10.5 - (Math.random() * 0.5)).toFixed(2)),
        current: Math.round(120 + Math.random() * 40),
        power: Math.round(70 + Math.random() * 25),
        frequency: parseFloat((49.5 + Math.random() * 0.5).toFixed(2)),
        powerFactor: parseFloat((0.85 + Math.random() * 0.1).toFixed(3))
      }
    };
    
    if (faultData.parameterChanges.load > 95 || faultData.parameterChanges.temperature > 90) {
      faultData.severity = 'Critical';
      faultData.severityDescription = 'Immediate action required - Risk of equipment failure';
      faultData.iecClassification = 'IEC 61850 - Critical';
    } else if (faultData.parameterChanges.load > 85 || faultData.parameterChanges.temperature > 80) {
      faultData.severity = 'Warning';
      faultData.severityDescription = 'Operator attention required - Monitor closely';
      faultData.iecClassification = 'IEC 61850 - Warning';
    } else {
      faultData.severity = 'Normal';
      faultData.severityDescription = 'System operating within limits';
      faultData.iecClassification = 'IEC 61850 - Normal';
    }

    faultData.recommendations = this.generateRecommendations(faultData);
    
    if (faultData.severity === 'Critical') {
      faultData.autoAction = {
        type: 'EMERGENCY_LOAD_SHEDDING',
        description: 'Auto-correction: Load shedding on ' + faultData.transformer + ' - 30% reduction',
        timestamp: new Date().toISOString(),
        severity: 'Critical',
        iecReference: 'IEC 61850 - Critical Fault Protocol'
      };
    } else if (faultData.severity === 'Warning') {
      faultData.autoAction = {
        type: 'AUTO_LOAD_TRANSFER',
        description: 'Auto-correction: Load transfer from ' + faultData.transformer,
        timestamp: new Date().toISOString(),
        severity: 'Warning',
        iecReference: 'IEC 61850 - Warning Protocol'
      };
    }

    return faultData;
  }

  generateRecommendations(fault) {
    const recommendations = {
      'Single Line to Ground Fault': {
        actions: [
          'Isolate affected phase using SCADA remote control',
          'Check grounding system resistance (< 5Ω)',
          'Inspect insulators for damage'
        ],
        iecReference: 'IEC 61850 - Ground Fault Protection'
      },
      'Line to Line Fault': {
        actions: [
          'Isolate both affected phases via circuit breaker',
          'Check for conductor contact',
          'Verify protection relay settings'
        ],
        iecReference: 'IEC 61850 - Line Protection'
      },
      'Double Line to Ground Fault': {
        actions: [
          'Isolate all affected phases immediately',
          'Check grounding system integrity',
          'Inspect transformer protection'
        ],
        iecReference: 'IEC 61850 - Double Line Protection'
      },
      'Three Phase Fault': {
        actions: [
          'IMMEDIATE isolation required - Trip all phases',
          'Check circuit breaker operation',
          'Inspect for equipment failure'
        ],
        iecReference: 'IEC 61850 - Three Phase Protection'
      },
      'Open Circuit Fault': {
        actions: [
          'Locate break point using TDR',
          'Check connectors and joints',
          'Schedule immediate repair'
        ],
        iecReference: 'IEC 61850 - Open Circuit Detection'
      },
      'Overcurrent Fault': {
        actions: [
          'Check protection relay settings',
          'Inspect circuit breaker operation',
          'Verify cable ratings'
        ],
        iecReference: 'IEC 61850 - Overcurrent Protection'
      },
      'Overvoltage Fault': {
        actions: [
          'Check voltage regulator operation',
          'Verify tap changer position',
          'Inspect surge protection'
        ],
        iecReference: 'IEC 61850 - Overvoltage Protection'
      }
    };

    const faultRecs = recommendations[fault.type] || {
      actions: ['Inspect system and isolate fault'],
      iecReference: 'IEC 61850 - General Protocol'
    };

    return {
      actions: faultRecs.actions,
      iecReference: faultRecs.iecReference
    };
  }

  generateInsights(data, faultActive) {
    const insights = [];
    const transformers = data.transformers || [];
    
    if (faultActive && data.fault) {
      insights.push('ACTIVE FAULT: ' + data.fault.type);
      insights.push('Location: ' + data.fault.transformer + ' at ' + data.fault.location);
      insights.push('Severity: ' + data.fault.severity + ' - ' + data.fault.severityDescription);
    } else {
      insights.push('System Normal - All Parameters within IEC 61850 Limits');
    }

    transformers.forEach(t => {
      const status = t.load > 75 || t.temperature > 70 ? 'Warning' : 'Normal';
      insights.push(t.id + ': ' + Math.round(t.load) + '% load | ' + Math.round(t.temperature) + '°C | ' + t.voltage + 'kV | ' + t.current + 'A | Status: ' + status);
    });

    return insights;
  }

  updateConfidence(data) {
    let totalScore = 0;
    let totalWeight = 0;
    
    data.transformers.forEach(t => {
      let transformerScore = 100;
      
      if (t.load > 85) {
        transformerScore -= 30;
      } else if (t.load > 75) {
        transformerScore -= 20;
      } else if (t.load > 65) {
        transformerScore -= 10;
      } else if (t.load > 55) {
        transformerScore -= 3;
      }
      
      if (t.temperature > 80) {
        transformerScore -= 30;
      } else if (t.temperature > 70) {
        transformerScore -= 20;
      } else if (t.temperature > 60) {
        transformerScore -= 10;
      } else if (t.temperature > 50) {
        transformerScore -= 3;
      }
      
      if (t.voltage < 10.5 || t.voltage > 11.5) {
        transformerScore -= 25;
      } else if (t.voltage < 10.7 || t.voltage > 11.3) {
        transformerScore -= 15;
      } else if (t.voltage < 10.9 || t.voltage > 11.1) {
        transformerScore -= 5;
      }
      
      if (t.current > 150) {
        transformerScore -= 25;
      } else if (t.current > 140) {
        transformerScore -= 15;
      } else if (t.current > 130) {
        transformerScore -= 10;
      } else if (t.current > 110) {
        transformerScore -= 5;
      }
      
      if (t.powerFactor < 0.80) {
        transformerScore -= 20;
      } else if (t.powerFactor < 0.85) {
        transformerScore -= 15;
      } else if (t.powerFactor < 0.90) {
        transformerScore -= 8;
      } else if (t.powerFactor < 0.95) {
        transformerScore -= 3;
      }
      
      transformerScore = Math.max(0, transformerScore);
      
      const weight = t.capacity / 100;
      totalScore += transformerScore * weight;
      totalWeight += weight;
    });
    
    let confidence = totalWeight > 0 ? totalScore / totalWeight : 90;
    
    if (this.faultActive) {
      confidence -= 30;
    }
    
    this.confidenceScore = Math.max(25, Math.min(98, Math.round(confidence)));
    
    return this.confidenceScore;
  }

  logAction(action) {
    const lastLog = this.actionLog[this.actionLog.length - 1];
    const isDuplicate = lastLog && 
                        lastLog.type === action.type && 
                        lastLog.faultId === action.faultId;
    
    if (!isDuplicate) {
      this.actionLog.push({
        ...action,
        logTime: new Date().toISOString()
      });
      if (this.actionLog.length > 50) {
        this.actionLog.shift();
      }
    }
  }

  startCountdown(callback) {
    this.countdownValue = 10;
    this.userActionPending = true;
    this.operatorActionTaken = false;
    
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
    }
    
    this.countdownInterval = setInterval(() => {
      this.countdownValue--;
      if (this.countdownValue <= 0) {
        clearInterval(this.countdownInterval);
        this.countdownInterval = null;
        if (this.userActionPending && !this.operatorActionTaken) {
          callback('auto');
        }
      }
    }, 1000);
  }

  handleUserAction(action) {
    this.userActionPending = false;
    this.operatorActionTaken = true;
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
      this.countdownInterval = null;
    }
  }

  resetFaultState() {
    this.faultActive = false;
    this.faultData = null;
    this.userActionPending = false;
    this.operatorActionTaken = false;
    this.countdownValue = 10;
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
      this.countdownInterval = null;
    }
    if (this.faultResolveTimer) {
      clearTimeout(this.faultResolveTimer);
      this.faultResolveTimer = null;
    }
  }
}

class SubstationSimulator {
  constructor() {
    this.transformers = [
      { id: 'T1', location: 'Bay A', capacity: 100, rating: 100 },
      { id: 'T2', location: 'Bay B', capacity: 80, rating: 80 },
      { id: 'T3', location: 'Bay C', capacity: 60, rating: 60 }
    ];
    this.aiEngine = new AIEngine();
    this.paramEngine = new SubstationParameters();
    this.mode = 'manual';
    this.faultTimer = null;
  }

  generateData() {
    if (this.aiEngine.faultActive && this.aiEngine.faultData) {
      const transformer = this.aiEngine.faultData.transformer;
      const changes = this.aiEngine.faultData.parameterChanges;
      manualOverrides[transformer] = {
        load: changes.load,
        temperature: changes.temperature,
        voltage: changes.voltage,
        current: changes.current,
        power: changes.power,
        frequency: changes.frequency,
        powerFactor: changes.powerFactor
      };
    }

    const data = {
      timestamp: new Date().toISOString(),
      transformers: this.transformers.map(t => {
        const load = this.simulateLoad(t.id);
        const temp = this.simulateTemperature(t.id);
        const params = this.paramEngine.generateParameters(t.id, load, temp);
        
        return {
          ...t,
          load: load,
          temperature: temp,
          voltage: params.voltage,
          current: params.current,
          power: params.power,
          frequency: params.frequency,
          powerFactor: params.powerFactor,
          status: this.getTransformerStatus(t.id)
        };
      }),
      anomalies: [],
      fault: this.aiEngine.faultActive ? this.aiEngine.faultData : null,
      aiActions: [],
      blackoutPrevented: false,
      mode: this.mode,
      aiInsights: [],
      confidenceScore: this.aiEngine.confidenceScore,
      actionLog: this.aiEngine.actionLog,
      anomalyLog: this.aiEngine.anomalyLog,
      countdownValue: this.aiEngine.countdownValue,
      userActionPending: this.aiEngine.userActionPending
    };

    data.controlRecommendations = this.aiEngine.generateControlRecommendations(data.transformers);

    const totalPower = data.transformers.reduce((sum, t) => sum + (t.load * t.capacity / 100), 0);
    data.totalPower = Math.round(totalPower);
    
    data.avgLoad = Math.round(data.transformers.reduce((sum, t) => sum + t.load, 0) / data.transformers.length);
    data.avgTemp = Math.round(data.transformers.reduce((sum, t) => sum + t.temperature, 0) / data.transformers.length);
    data.avgVoltage = parseFloat((data.transformers.reduce((sum, t) => sum + t.voltage, 0) / data.transformers.length).toFixed(2));
    data.avgCurrent = Math.round(data.transformers.reduce((sum, t) => sum + t.current, 0) / data.transformers.length);
    data.avgPowerFactor = parseFloat((data.transformers.reduce((sum, t) => sum + t.powerFactor, 0) / data.transformers.length).toFixed(3));
    data.systemEfficiency = Math.max(0, 100 - (data.avgLoad / 100 * 30));

    // Check for anomalies
    let currentAnomalies = [];
    data.transformers.forEach(t => {
      const issues = [];
      if (t.temperature > 70) issues.push('Temp ' + Math.round(t.temperature) + '°C');
      if (t.load > 75) issues.push('Load ' + Math.round(t.load) + '%');
      if (t.voltage < 10.5 || t.voltage > 11.5) issues.push('Voltage ' + t.voltage + 'kV');
      if (t.current > 140) issues.push('Current ' + t.current + 'A');
      if (t.powerFactor < 0.85) issues.push('PF ' + t.powerFactor);
      
      if (issues.length > 0) {
        const anomaly = {
          type: issues.join(', '),
          source: t.id,
          severity: 'Warning',
          value: issues.join(' | '),
          timestamp: new Date().toISOString()
        };
        currentAnomalies.push(anomaly);
      }
    });

    data.anomalies = currentAnomalies;

    if (this.mode === 'auto' && !this.aiEngine.faultActive) {
      if (!this.faultTimer) {
        this.faultTimer = setTimeout(() => {
          this.generateNewFault();
          this.faultTimer = null;
        }, 180000);
      }
    }

    data.aiInsights = this.aiEngine.generateInsights(data, this.aiEngine.faultActive);
    data.confidenceScore = this.aiEngine.updateConfidence(data);

    return data;
  }

  getTransformerStatus(id) {
    const t = this.transformers.find(t => t.id === id);
    if (!t) return 'normal';
    const load = manualOverrides[id]?.load !== null ? manualOverrides[id].load : t.load;
    const temp = manualOverrides[id]?.temperature !== null ? manualOverrides[id].temperature : t.temperature;
    
    if (load > 95 || temp > 90) return 'critical';
    if (load > 85 || temp > 80) return 'warning';
    return 'normal';
  }

  generateNewFault(transformerId, faultType) {
    if (this.aiEngine.faultActive) return;

    const fault = this.aiEngine.generateFault(transformerId, faultType);
    this.aiEngine.faultActive = true;
    this.aiEngine.faultData = fault;
    this.aiEngine.countdownValue = 10;

    const changes = fault.parameterChanges;
    manualOverrides[fault.transformer] = {
      load: changes.load,
      temperature: changes.temperature,
      voltage: changes.voltage,
      current: changes.current,
      power: changes.power,
      frequency: changes.frequency,
      powerFactor: changes.powerFactor
    };

    console.log('FAULT: ' + fault.type + ' on ' + fault.transformer);

    this.aiEngine.startCountdown((action) => {
      this.handleUserAction(action);
    });
  }

  handleUserAction(action) {
    if (!this.aiEngine.userActionPending) return;
    
    this.aiEngine.handleUserAction(action);
    
    if (this.aiEngine.faultResolveTimer) {
      clearTimeout(this.aiEngine.faultResolveTimer);
      this.aiEngine.faultResolveTimer = null;
    }
    
    if (action === 'acknowledge') {
      console.log('OPERATOR: Acknowledged fault on ' + this.aiEngine.faultData?.transformer);
      
      this.aiEngine.faultResolveTimer = setTimeout(() => {
        this.resolveFault();
        console.log('Fault resolved by operator');
      }, 3000);
      
    } else {
      console.log('AI: Auto-correction executed on ' + this.aiEngine.faultData?.transformer);
      
      this.aiEngine.logAction({
        type: 'AI_AUTO_CORRECTION',
        action: 'auto',
        faultId: this.aiEngine.faultData?.id,
        transformer: this.aiEngine.faultData?.transformer,
        faultType: this.aiEngine.faultData?.type,
        severity: this.aiEngine.faultData?.severity,
        description: this.aiEngine.faultData?.autoAction?.description || 'AI auto-correction executed'
      });
      
      if (this.aiEngine.faultData?.severity === 'Critical') {
        this.aiEngine.blackoutsPrevented++;
        console.log('Blackout prevented on ' + this.aiEngine.faultData?.transformer);
      }
      
      this.aiEngine.faultResolveTimer = setTimeout(() => {
        this.resolveFault();
        console.log('Fault resolved by AI');
      }, 2000);
    }
  }

  resolveFault() {
    this.aiEngine.resetFaultState();
    
    Object.keys(manualOverrides).forEach(key => {
      manualOverrides[key] = { 
        load: null, 
        temperature: null,
        voltage: null,
        current: null,
        power: null,
        frequency: null,
        powerFactor: null
      };
    });
  }

  toggleMode() {
    this.mode = this.mode === 'manual' ? 'auto' : 'manual';
    if (this.mode === 'auto') {
      this.faultTimer = null;
      console.log('Auto-Fault Mode activated');
    } else {
      clearTimeout(this.faultTimer);
      this.faultTimer = null;
      console.log('Manual Mode activated');
    }
    return this.mode;
  }

  simulateLoad(id) {
    const base = { T1: 65, T2: 55, T3: 45 }[id] || 50;
    if (manualOverrides[id]?.load !== null) {
      return manualOverrides[id].load;
    }
    const hour = new Date().getHours();
    let factor = 1;
    if (hour > 7 && hour < 10) factor = 1.4;
    else if (hour > 17 && hour < 21) factor = 1.6;
    else if (hour > 23 || hour < 5) factor = 0.5;
    return Math.min(100, (base + (Math.random() - 0.5) * 20) * factor);
  }

  simulateTemperature(id) {
    const base = { T1: 60, T2: 55, T3: 50 }[id] || 55;
    if (manualOverrides[id]?.temperature !== null) {
      return manualOverrides[id].temperature;
    }
    return base + (Math.random() - 0.5) * 15;
  }
}

const simulator = new SubstationSimulator();
let manualOverrides = {
  T1: { load: null, temperature: null, voltage: null, current: null, power: null, frequency: null, powerFactor: null },
  T2: { load: null, temperature: null, voltage: null, current: null, power: null, frequency: null, powerFactor: null },
  T3: { load: null, temperature: null, voltage: null, current: null, power: null, frequency: null, powerFactor: null }
};

io.on('connection', (socket) => {
  console.log('Client connected: ' + socket.id);

  const initialData = simulator.generateData();
  socket.emit('substation-update', initialData);
  socket.emit('ai-insights', initialData.aiInsights);

  const interval = setInterval(() => {
    const data = simulator.generateData();
    socket.emit('substation-update', data);
    socket.emit('ai-insights', data.aiInsights);
  }, 2000);

  socket.on('disconnect', () => {
    console.log('Client disconnected: ' + socket.id);
    clearInterval(interval);
  });
});

app.post('/api/control/transformer', (req, res) => {
  const { id, load, temperature } = req.body;
  if (manualOverrides[id]) {
    if (load !== undefined) manualOverrides[id].load = load;
    if (temperature !== undefined) manualOverrides[id].temperature = temperature;
    res.json({ success: true, message: 'Transformer ' + id + ' updated' });
  } else {
    res.status(404).json({ error: 'Transformer not found' });
  }
});

app.post('/api/control/reset/:id', (req, res) => {
  const { id } = req.params;
  if (manualOverrides[id]) {
    manualOverrides[id] = { load: null, temperature: null, voltage: null, current: null, power: null, frequency: null, powerFactor: null };
    res.json({ success: true, message: id + ' reset to automatic' });
  } else {
    res.status(404).json({ error: 'Transformer not found' });
  }
});

app.post('/api/control/anomaly', (req, res) => {
  const { type, transformer } = req.body;
  
  const targetTransformer = transformer || 'T1';
  
  if (type === 'overload') {
    manualOverrides[targetTransformer].load = 92;
    manualOverrides[targetTransformer].temperature = 78;
    console.log('OVERLOAD on ' + targetTransformer);
  } else if (type === 'overheat') {
    manualOverrides[targetTransformer].temperature = 88;
    manualOverrides[targetTransformer].load = 75;
    console.log('OVERHEAT on ' + targetTransformer);
  } else if (type === 'critical') {
    manualOverrides[targetTransformer].load = 96;
    manualOverrides[targetTransformer].temperature = 92;
    manualOverrides[targetTransformer].voltage = 10.0;
    manualOverrides[targetTransformer].current = 180;
    if (!simulator.aiEngine.faultActive) {
      simulator.generateNewFault(targetTransformer, 'Three Phase Fault');
    }
    console.log('CRITICAL on ' + targetTransformer);
  } else if (type === 'random') {
    const rand = Math.random();
    if (rand < 0.33) {
      manualOverrides[targetTransformer].load = 92;
      manualOverrides[targetTransformer].temperature = 85;
    } else if (rand < 0.66) {
      manualOverrides[targetTransformer].temperature = 88;
      manualOverrides[targetTransformer].load = 78;
    } else {
      manualOverrides[targetTransformer].load = 95;
      manualOverrides[targetTransformer].temperature = 82;
    }
    console.log('RANDOM on ' + targetTransformer);
  }
  
  res.json({ success: true, message: 'Anomaly ' + type + ' generated on ' + targetTransformer });
});

app.post('/api/control/mode', (req, res) => {
  const mode = simulator.toggleMode();
  res.json({ 
    success: true, 
    mode: mode,
    message: mode === 'manual' ? 'Manual Mode' : 'Auto-Fault Mode'
  });
});

app.post('/api/fault/generate', (req, res) => {
  if (simulator.aiEngine.faultActive) {
    return res.json({ 
      success: false, 
      message: 'A fault is already active' 
    });
  }
  const { transformer, faultType } = req.body;
  simulator.generateNewFault(transformer, faultType);
  res.json({ 
    success: true, 
    message: 'Fault generated',
    fault: simulator.aiEngine.faultData
  });
});

app.post('/api/fault/action', (req, res) => {
  const { action, actions } = req.body;
  
  if (action === 'acknowledge') {
    if (actions && actions.length > 0) {
      simulator.aiEngine.logAction({
        type: 'OPERATOR_ACTION',
        action: 'acknowledge',
        faultId: simulator.aiEngine.faultData?.id,
        transformer: simulator.aiEngine.faultData?.transformer,
        faultType: simulator.aiEngine.faultData?.type,
        severity: simulator.aiEngine.faultData?.severity,
        description: 'Operator executed ' + actions.length + ' corrective actions',
        actions: actions
      });
    }
  } else if (action === 'auto') {
    simulator.aiEngine.logAction({
      type: 'AI_AUTO_CORRECTION',
      action: 'auto',
      faultId: simulator.aiEngine.faultData?.id,
      transformer: simulator.aiEngine.faultData?.transformer,
      faultType: simulator.aiEngine.faultData?.type,
      severity: simulator.aiEngine.faultData?.severity,
      description: simulator.aiEngine.faultData?.autoAction?.description || 'AI auto-correction executed'
    });
  }
  
  simulator.handleUserAction(action);
  res.json({ success: true, message: 'Action ' + action + ' received' });
});

app.get('/api/status', (req, res) => {
  res.json({
    status: 'online',
    mode: simulator.mode,
    faultActive: simulator.aiEngine.faultActive,
    blackoutsPrevented: simulator.aiEngine.blackoutsPrevented,
    confidence: simulator.aiEngine.confidenceScore,
    actionLog: simulator.aiEngine.actionLog,
    anomalyLog: simulator.aiEngine.anomalyLog,
    countdownValue: simulator.aiEngine.countdownValue,
    userActionPending: simulator.aiEngine.userActionPending
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log('==================================================');
  console.log('DIGITAL TWIN SUBSTATION');
  console.log('==================================================');
  console.log('Server running on http://localhost:' + PORT);
  console.log('Mode: Manual');
  console.log('IEC 61850 Standards Active');
  console.log('==================================================');
});