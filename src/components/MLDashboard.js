import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import axios from 'axios';

const MLContainer = styled.div`
  padding: 20px;
  background: #ffffff;
  border-radius: 12px;
  margin-bottom: 20px;
  color: #2c3e50;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
  border: 1px solid #e1e8ed;
`;

const MLHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
  
  h2 {
    margin: 0;
    display: flex;
    align-items: center;
    gap: 10px;
  }
`;

const StatusBadge = styled.span`
  padding: 6px 14px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  background: ${props => props.available ? 
    'linear-gradient(135deg, #d4edda, #c3e6cb)' : 
    'linear-gradient(135deg, #f8d7da, #f5c6cb)'};
  color: ${props => props.available ? '#155724' : '#721c24'};
  border: 1px solid ${props => props.available ? '#c3e6cb' : '#f5c6cb'};
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 15px;
  margin-bottom: 25px;
`;

const StatCard = styled.div`
  background: linear-gradient(135deg, #f8f9fa, #ffffff);
  padding: 18px;
  border-radius: 12px;
  border: 1px solid #e9ecef;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  
  &:hover {
    transform: translateY(-3px);
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
    border-color: #dee2e6;
  }
  
  .stat-label {
    font-size: 12px;
    margin-bottom: 8px;
    color: #6c757d;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  
  .stat-value {
    font-size: 28px;
    font-weight: 700;
    margin-bottom: 5px;
    color: #2c3e50;
  }
  
  .stat-subtitle {
    font-size: 11px;
    color: #868e96;
    font-weight: 400;
  }
`;

const PredictionsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 15px;
  margin-top: 20px;
`;

const PredictionCard = styled.div`
  background: #ffffff;
  color: #2c3e50;
  padding: 20px;
  border-radius: 12px;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.08);
  border: 1px solid #e1e8ed;
  transition: all 0.3s ease;
  
  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 12px 30px rgba(0, 0, 0, 0.12);
  }
`;

const SensorHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
  
  .sensor-id {
    font-weight: 700;
    color: #2c3e50;
    font-size: 16px;
  }
  
  .ml-status {
    font-size: 11px;
    padding: 4px 10px;
    border-radius: 15px;
    background: ${props => props.available ? 
      'linear-gradient(135deg, #27ae60, #2ecc71)' : 
      'linear-gradient(135deg, #f39c12, #e67e22)'};
    color: white;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
`;

const TrafficState = styled.div`
  text-align: center;
  margin: 15px 0;
  padding: 15px;
  background: ${props => {
    switch(props.state) {
      case 'Free Flow': return 'linear-gradient(135deg, #d4edda, #c3e6cb)';
      case 'Light Traffic': return 'linear-gradient(135deg, #fff3cd, #ffeaa7)';
      case 'Heavy Congestion': return 'linear-gradient(135deg, #f8d7da, #f5c6cb)';
      case 'Gridlock': return 'linear-gradient(135deg, #f8d7da, #f1b0b7)';
      default: return 'linear-gradient(135deg, #e2e3e5, #d6d8db)';
    }
  }};
  border-radius: 10px;
  border: 1px solid ${props => {
    switch(props.state) {
      case 'Free Flow': return '#c3e6cb';
      case 'Light Traffic': return '#ffeaa7';
      case 'Heavy Congestion': return '#f5c6cb';
      case 'Gridlock': return '#f1b0b7';
      default: return '#d6d8db';
    }
  }};
  
  .state {
    font-size: 18px;
    font-weight: 700;
    color: ${props => {
      switch(props.state) {
        case 'Free Flow': return '#155724';
        case 'Light Traffic': return '#856404';
        case 'Heavy Congestion': return '#721c24';
        case 'Gridlock': return '#721c24';
        default: return '#6c757d';
      }
    }};
    margin-bottom: 5px;
  }
  
  .confidence {
    font-size: 14px;
    color: #6c757d;
    font-weight: 500;
  }
`;

const PredictionDetails = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  font-size: 12px;
  margin: 15px 0;
  
  .detail {
    display: flex;
    justify-content: space-between;
    padding: 8px 0;
    border-bottom: 1px solid #f0f0f0;
  }
  
  .label {
    font-weight: 500;
    color: #7f8c8d;
  }
  
  .value {
    font-weight: 600;
    color: #2c3e50;
  }
`;

const AnomalyBadge = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  margin-top: 10px;
  background: ${props => props.anomaly ? 
    'linear-gradient(135deg, #ffebee, #ffcdd2)' : 
    'linear-gradient(135deg, #e8f5e8, #c8e6c9)'};
  color: ${props => props.anomaly ? '#d32f2f' : '#388e3c'};
  border: 1px solid ${props => props.anomaly ? '#ffcdd2' : '#a5d6a7'};
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
`;

const LoadingSpinner = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100px;
  
  .spinner {
    border: 3px solid #f0f0f0;
    border-radius: 50%;
    border-top: 3px solid #3498db;
    width: 35px;
    height: 35px;
    animation: spin 1s linear infinite;
  }
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

const ErrorMessage = styled.div`
  background: linear-gradient(135deg, #f8d7da, #f5c6cb);
  color: #721c24;
  padding: 20px;
  border-radius: 12px;
  text-align: center;
  margin: 20px 0;
  border: 1px solid #f5c6cb;
  font-weight: 500;
`;

const MLDashboard = () => {
  const [mlData, setMlData] = useState(null);
  const [mlHealth, setMlHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadMLData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Load ML predictions and health in parallel
      const [predictionsResponse, healthResponse] = await Promise.all([
        axios.get('/api/ml/predictions'),
        axios.get('/api/ml/health')
      ]);
      
      setMlData(predictionsResponse.data);
      setMlHealth(healthResponse.data);
      
    } catch (err) {
      console.error('Error loading ML data:', err);
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMLData();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadMLData, 30000);
    return () => clearInterval(interval);
  }, []);

  const formatConfidence = (confidence) => {
    return `${(confidence * 100).toFixed(1)}%`;
  };

  const formatDuration = (duration) => {
    return duration || 'Unknown';
  };

  if (loading) {
    return (
      <MLContainer>
        <MLHeader>
          <h2>🤖 AI Traffic Predictions</h2>
        </MLHeader>
        <LoadingSpinner>
          <div className="spinner"></div>
        </LoadingSpinner>
      </MLContainer>
    );
  }

  if (error) {
    return (
      <MLContainer>
        <MLHeader>
          <h2>🤖 AI Traffic Predictions</h2>
          <StatusBadge available={false}>Offline</StatusBadge>
        </MLHeader>
        <ErrorMessage>
          ❌ Error loading ML predictions: {error}
        </ErrorMessage>
      </MLContainer>
    );
  }

  const summary = mlData?.summary || {};
  const predictions = mlData?.predictions || [];

  return (
    <MLContainer>
      <MLHeader>
        <h2>🤖 AI Traffic Predictions</h2>
        <StatusBadge available={mlHealth?.ml_api_available}>
          {mlHealth?.ml_api_available ? 'Online' : 'Offline'}
        </StatusBadge>
      </MLHeader>

      <StatsGrid>
        <StatCard>
          <div className="stat-label">Total Sensors</div>
          <div className="stat-value">{summary.total_sensors || 0}</div>
          <div className="stat-subtitle">Traffic monitoring points</div>
        </StatCard>
        
        <StatCard>
          <div className="stat-label">ML Availability</div>
          <div className="stat-value">{summary.ml_availability_rate?.toFixed(1) || 0}%</div>
          <div className="stat-subtitle">{summary.ml_available_count || 0} of {summary.total_sensors || 0} active</div>
        </StatCard>
        
        <StatCard>
          <div className="stat-label">Anomalies Detected</div>
          <div className="stat-value">{summary.anomaly_count || 0}</div>
          <div className="stat-subtitle">{summary.anomaly_rate?.toFixed(1) || 0}% anomaly rate</div>
        </StatCard>
        
        <StatCard>
          <div className="stat-label">Avg Confidence</div>
          <div className="stat-value">{formatConfidence(summary.avg_confidence || 0)}</div>
          <div className="stat-subtitle">Prediction accuracy</div>
        </StatCard>
      </StatsGrid>

      {summary.state_distribution && (
        <StatsGrid>
          {Object.entries(summary.state_distribution).map(([state, count]) => (
            <StatCard key={state}>
              <div className="stat-label">{state}</div>
              <div className="stat-value">{count}</div>
              <div className="stat-subtitle">sensors in this state</div>
            </StatCard>
          ))}
        </StatsGrid>
      )}

      <PredictionsGrid>
        {predictions.map((prediction) => (
          <PredictionCard key={prediction.sensor_id}>
            <SensorHeader available={prediction.ml_available}>
              <div className="sensor-id">{prediction.sensor_id}</div>
              <div className="ml-status">
                {prediction.ml_available ? '🤖 AI' : '⚠️ Fallback'}
              </div>
            </SensorHeader>

            <TrafficState state={prediction.predictions?.traffic_state}>
              <div className="state">
                {prediction.predictions?.traffic_state || 'Unknown'}
              </div>
              <div className="confidence">
                Confidence: {formatConfidence(prediction.predictions?.confidence || 0)}
              </div>
            </TrafficState>

            <PredictionDetails>
              <div className="detail">
                <span className="label">Severity:</span>
                <span className="value">{prediction.predictions?.severity || 'Low'}</span>
              </div>
              <div className="detail">
                <span className="label">Duration:</span>
                <span className="value">{formatDuration(prediction.predictions?.predicted_duration)}</span>
              </div>
              <div className="detail">
                <span className="label">Vehicles:</span>
                <span className="value">{prediction.input_data?.vehicle_count?.toFixed(0) || 0}</span>
              </div>
              <div className="detail">
                <span className="label">Speed:</span>
                <span className="value">{prediction.input_data?.avg_speed?.toFixed(0) || 0} km/h</span>
              </div>
              <div className="detail">
                <span className="label">Wait Time:</span>
                <span className="value">{prediction.input_data?.wait_time_s?.toFixed(0) || 0}s</span>
              </div>
              <div className="detail">
                <span className="label">Model:</span>
                <span className="value">{prediction.predictions?.model_version || 'N/A'}</span>
              </div>
            </PredictionDetails>

            <AnomalyBadge anomaly={prediction.predictions?.anomaly_detected}>
              {prediction.predictions?.anomaly_detected ? '🚨 Anomaly Detected' : '✅ Normal Traffic'}
              {prediction.predictions?.anomaly_score && (
                <span> (Score: {prediction.predictions.anomaly_score.toFixed(2)})</span>
              )}
            </AnomalyBadge>
          </PredictionCard>
        ))}
      </PredictionsGrid>

      {predictions.length === 0 && (
        <ErrorMessage>
          No ML predictions available. Make sure the ML API service is running.
        </ErrorMessage>
      )}
    </MLContainer>
  );
};

export default MLDashboard; 