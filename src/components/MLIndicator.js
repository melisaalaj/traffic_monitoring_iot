import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import axios from 'axios';

const MLBadge = styled.div`
  position: absolute;
  top: 10px;
  right: 10px;
  background: ${props => {
    switch(props.state) {
      case 'Free Flow': return 'linear-gradient(135deg, #4CAF50, #66BB6A)';
      case 'Light Traffic': return 'linear-gradient(135deg, #8BC34A, #9CCC65)';
      case 'Heavy Congestion': return 'linear-gradient(135deg, #FF9800, #FFB74D)';
      case 'Gridlock': return 'linear-gradient(135deg, #f44336, #EF5350)';
      default: return 'linear-gradient(135deg, #9E9E9E, #BDBDBD)';
    }
  }};
  color: white;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 10px;
  font-weight: bold;
  text-align: center;
  box-shadow: 0 2px 4px rgba(0,0,0,0.2);
  min-width: 60px;
  opacity: ${props => props.loading ? 0.5 : 1};
  transition: all 0.3s ease;
  
  .state {
    display: block;
    margin-bottom: 2px;
    font-size: 9px;
  }
  
  .confidence {
    font-size: 8px;
    opacity: 0.9;
  }
  
  .anomaly {
    color: #ffeb3b;
    font-size: 8px;
    margin-top: 2px;
  }
`;

const MLTooltip = styled.div`
  position: absolute;
  top: 100%;
  right: 0;
  background: rgba(0, 0, 0, 0.9);
  color: white;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 11px;
  white-space: nowrap;
  z-index: 1000;
  box-shadow: 0 4px 12px rgba(0,0,0,0.3);
  opacity: ${props => props.visible ? 1 : 0};
  transform: translateY(${props => props.visible ? '5px' : '0px'});
  transition: all 0.2s ease;
  pointer-events: none;
  
  &::before {
    content: '';
    position: absolute;
    top: -4px;
    right: 12px;
    width: 0;
    height: 0;
    border-left: 4px solid transparent;
    border-right: 4px solid transparent;
    border-bottom: 4px solid rgba(0, 0, 0, 0.9);
  }
`;

const MLIndicator = ({ sensorId, sensorType }) => {
  const [prediction, setPrediction] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showTooltip, setShowTooltip] = useState(false);

  useEffect(() => {
    // Only show ML predictions for traffic sensors
    if (sensorType !== 'traffic') {
      setLoading(false);
      return;
    }

    const loadPrediction = async () => {
      try {
        const response = await axios.get(`/api/ml/predict/${sensorId}`);
        setPrediction(response.data);
      } catch (error) {
        // Fail silently - ML predictions are optional
        console.debug('ML prediction unavailable for', sensorId);
      } finally {
        setLoading(false);
      }
    };

    loadPrediction();
    
    // Refresh every 60 seconds
    const interval = setInterval(loadPrediction, 60000);
    return () => clearInterval(interval);
  }, [sensorId, sensorType]);

  // Don't show anything for non-traffic sensors or if no prediction
  if (sensorType !== 'traffic' || (!prediction && !loading)) {
    return null;
  }

  if (loading) {
    return (
      <MLBadge loading={true}>
        <div className="state">🤖</div>
        <div className="confidence">Loading...</div>
      </MLBadge>
    );
  }

  if (!prediction?.predictions) {
    return null;
  }

  const { predictions } = prediction;
  const confidence = Math.round(predictions.confidence * 100);

  return (
    <MLBadge 
      state={predictions.traffic_state}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <div className="state">
        {predictions.traffic_state === 'Free Flow' && '🟢'}
        {predictions.traffic_state === 'Light Traffic' && '🟡'}
        {predictions.traffic_state === 'Heavy Congestion' && '🟠'}
        {predictions.traffic_state === 'Gridlock' && '🔴'}
        {!predictions.traffic_state && '🤖'}
      </div>
      <div className="confidence">{confidence}%</div>
      {predictions.anomaly_detected && (
        <div className="anomaly">⚠️</div>
      )}
      
      <MLTooltip visible={showTooltip}>
        <div><strong>AI Prediction</strong></div>
        <div>State: {predictions.traffic_state}</div>
        <div>Confidence: {confidence}%</div>
        <div>Severity: {predictions.severity}</div>
        <div>Duration: {predictions.predicted_duration}</div>
        {predictions.anomaly_detected && (
          <div style={{ color: '#ffeb3b' }}>⚠️ Anomaly Detected</div>
        )}
        <div style={{ fontSize: '9px', opacity: 0.7, marginTop: '4px' }}>
          Model: {predictions.model_version}
        </div>
      </MLTooltip>
    </MLBadge>
  );
};

export default MLIndicator; 