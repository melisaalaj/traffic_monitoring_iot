import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import axios from 'axios';

const MLContainer = styled.div`
  padding: 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px;
  margin-bottom: 20px;
  color: white;
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
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: bold;
  background: ${props => props.available ? '#4CAF50' : '#f44336'};
  color: white;
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 15px;
  margin-bottom: 25px;
`;

const StatCard = styled.div`
  background: rgba(255, 255, 255, 0.1);
  padding: 15px;
  border-radius: 8px;
  backdrop-filter: blur(10px);
  
  .stat-label {
    font-size: 12px;
    opacity: 0.8;
    margin-bottom: 5px;
  }
  
  .stat-value {
    font-size: 24px;
    font-weight: bold;
    margin-bottom: 5px;
  }
  
  .stat-subtitle {
    font-size: 11px;
    opacity: 0.7;
  }
`;

const PredictionsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 15px;
  margin-top: 20px;
`;

const PredictionCard = styled.div`
  background: rgba(255, 255, 255, 0.95);
  color: #333;
  padding: 20px;
  border-radius: 10px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  transition: transform 0.2s ease;
  
  &:hover {
    transform: translateY(-2px);
  }
`;

const SensorHeader = styled.div`
  display: flex;
  justify-content: between;
  align-items: center;
  margin-bottom: 15px;
  
  .sensor-id {
    font-weight: bold;
    color: #2196F3;
  }
  
  .ml-status {
    font-size: 12px;
    padding: 2px 8px;
    border-radius: 12px;
    background: ${props => props.available ? '#4CAF50' : '#ff9800'};
    color: white;
  }
`;

const TrafficState = styled.div`
  text-align: center;
  margin: 15px 0;
  
  .state {
    font-size: 18px;
    font-weight: bold;
    color: ${props => {
      switch(props.state) {
        case 'Free Flow': return '#4CAF50';
        case 'Light Traffic': return '#8BC34A';
        case 'Heavy Congestion': return '#FF9800';
        case 'Gridlock': return '#f44336';
        default: return '#757575';
      }
    }};
    margin-bottom: 5px;
  }
  
  .confidence {
    font-size: 14px;
    color: #666;
  }
`;

const PredictionDetails = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  font-size: 12px;
  
  .detail {
    display: flex;
    justify-content: space-between;
    padding: 5px 0;
    border-bottom: 1px solid #eee;
  }
  
  .label {
    font-weight: 500;
    color: #666;
  }
  
  .value {
    font-weight: bold;
  }
`;

const AnomalyBadge = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 10px;
  border-radius: 15px;
  font-size: 12px;
  font-weight: bold;
  margin-top: 10px;
  background: ${props => props.anomaly ? '#ffebee' : '#e8f5e8'};
  color: ${props => props.anomaly ? '#c62828' : '#2e7d32'};
  border: 1px solid ${props => props.anomaly ? '#f8bbd9' : '#c8e6c9'};
`;

const LoadingSpinner = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100px;
  
  .spinner {
    border: 3px solid rgba(255, 255, 255, 0.3);
    border-radius: 50%;
    border-top: 3px solid white;
    width: 30px;
    height: 30px;
    animation: spin 1s linear infinite;
  }
  
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

const ErrorMessage = styled.div`
  background: rgba(244, 67, 54, 0.1);
  color: #f44336;
  padding: 15px;
  border-radius: 8px;
  text-align: center;
  margin: 20px 0;
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