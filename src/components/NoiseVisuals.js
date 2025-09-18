import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import axios from 'axios';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  RadialLinearScale,
} from 'chart.js';
import { Line, Bar, Doughnut, Radar } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  RadialLinearScale
);

const VisualsContainer = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 20px;
  margin: 20px 0;
`;

const ChartCard = styled.div`
  background: white;
  padding: 20px;
  border-radius: 12px;
  box-shadow: 0 3px 10px rgba(0,0,0,0.1);
  border-left: 4px solid #e74c3c;
`;

const ChartTitle = styled.h3`
  color: #2c3e50;
  margin: 0 0 15px 0;
  font-size: 1.2em;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const ChartWrapper = styled.div`
  height: 300px;
  position: relative;
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 15px;
  margin-bottom: 20px;
`;

const StatBox = styled.div`
  background: #f8f9fa;
  padding: 15px;
  border-radius: 8px;
  text-align: center;
  border-left: 3px solid ${props => props.color || '#e74c3c'};
`;

const StatValue = styled.div`
  font-size: 1.5em;
  font-weight: 600;
  color: #2c3e50;
  margin-bottom: 5px;
`;

const StatLabel = styled.div`
  font-size: 0.9em;
  color: #7f8c8d;
`;

const NoiseIndicator = styled.div`
  display: inline-block;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 0.8em;
  font-weight: 600;
  background: ${props => {
    switch(props.level) {
      case 'Quiet': return '#2ecc71';
      case 'Moderate': return '#f39c12';
      case 'Loud': return '#e67e22';
      case 'Very Loud': return '#e74c3c';
      default: return '#95a5a6';
    }
  }};
  color: white;
`;

const NoiseVisuals = ({ sensors }) => {
  const [chartData, setChartData] = useState({
    noiseLevels: null,
    noiseDistribution: null,
    noiseCategorization: null,
    noiseComparison: null
  });
  const [historicalData, setHistoricalData] = useState([]);

  useEffect(() => {
    loadHistoricalData();
  }, []);

  const loadHistoricalData = async () => {
    try {
      const response = await axios.get('/api/noise/historical?period=day');
      setHistoricalData(response.data.historical_data || []);
    } catch (err) {
      console.error('Error loading noise historical data:', err);
      setHistoricalData([]);
    }
  };

  const getNoiseLevel = (db) => {
    if (db <= 40) return 'Quiet';
    if (db <= 60) return 'Moderate';
    if (db <= 80) return 'Loud';
    if (db <= 100) return 'Very Loud';
    return 'Extremely Loud';
  };

  const getNoiseColor = (db) => {
    if (db <= 40) return '#2ecc71';
    if (db <= 60) return '#f39c12';
    if (db <= 80) return '#e67e22';
    if (db <= 100) return '#e74c3c';
    return '#8e44ad';
  };

  const generateChartData = React.useCallback((noiseSensors) => {
    // Noise Levels by Sensor (Line Chart with color coding)
    const noiseLevelsData = {
      labels: noiseSensors.map(s => s.sensor_id.replace('Noise-', 'N')),
      datasets: [
        {
          label: 'Noise Level (dB)',
          data: noiseSensors.map(s => parseFloat(s.noise_db) || 0),
          borderColor: '#e74c3c',
          backgroundColor: 'rgba(231, 76, 60, 0.1)',
          borderWidth: 2,
          fill: true,
          tension: 0.4,
          pointBackgroundColor: noiseSensors.map(s => getNoiseColor(parseFloat(s.noise_db) || 0)),
          pointBorderColor: noiseSensors.map(s => getNoiseColor(parseFloat(s.noise_db) || 0)),
          pointRadius: 6,
        },
        {
          label: 'WHO Safe Level (55 dB)',
          data: new Array(noiseSensors.length).fill(55),
          borderColor: '#27ae60',
          backgroundColor: 'rgba(39, 174, 96, 0.1)',
          borderWidth: 2,
          borderDash: [5, 5],
          fill: false,
        }
      ]
    };

    // Noise Distribution (Bar Chart)
    const noiseRanges = ['<40 dB', '40-60 dB', '61-80 dB', '81-100 dB', '>100 dB'];
    const noiseCounts = [0, 0, 0, 0, 0];
    
    noiseSensors.forEach(sensor => {
      const noise = parseFloat(sensor.noise_db) || 0;
      if (noise <= 40) noiseCounts[0]++;
      else if (noise <= 60) noiseCounts[1]++;
      else if (noise <= 80) noiseCounts[2]++;
      else if (noise <= 100) noiseCounts[3]++;
      else noiseCounts[4]++;
    });

    const noiseDistributionData = {
      labels: noiseRanges,
      datasets: [
        {
          label: 'Number of Sensors',
          data: noiseCounts,
          backgroundColor: [
            '#2ecc71',
            '#f39c12',
            '#e67e22',
            '#e74c3c',
            '#8e44ad'
          ],
          borderColor: [
            '#27ae60',
            '#e67e22',
            '#d35400',
            '#c0392b',
            '#7d3c98'
          ],
          borderWidth: 1,
        }
      ]
    };

    // Noise Categorization (Doughnut Chart)
    const noiseCategoryCounts = { Quiet: 0, Moderate: 0, Loud: 0, 'Very Loud': 0, 'Extremely Loud': 0 };
    noiseSensors.forEach(sensor => {
      const db = parseFloat(sensor.noise_db) || 0;
      const level = getNoiseLevel(db);
      noiseCategoryCounts[level]++;
    });

    const noiseCategorizationData = {
      labels: Object.keys(noiseCategoryCounts).filter(key => noiseCategoryCounts[key] > 0),
      datasets: [
        {
          data: Object.values(noiseCategoryCounts).filter(count => count > 0),
          backgroundColor: [
            '#2ecc71',
            '#f39c12',
            '#e67e22',
            '#e74c3c',
            '#8e44ad'
          ],
          borderColor: [
            '#27ae60',
            '#e67e22',
            '#d35400',
            '#c0392b',
            '#7d3c98'
          ],
          borderWidth: 2,
        }
      ]
    };

    // Noise Comparison with Standards (Radar Chart)
    const standards = {
      'WHO Guideline': 55,
      'Residential Limit': 45,
      'Commercial Limit': 65,
      'Industrial Limit': 75,
      'Highway Level': 85
    };

    const avgNoise = noiseSensors.reduce((sum, s) => 
      sum + (parseFloat(s.noise_db) || 0), 0) / noiseSensors.length;

    const noiseComparisonData = {
      labels: Object.keys(standards),
      datasets: [
        {
          label: 'Current Average',
          data: Object.values(standards).map(() => avgNoise),
          borderColor: '#e74c3c',
          backgroundColor: 'rgba(231, 76, 60, 0.2)',
          borderWidth: 2,
        },
        {
          label: 'Standards',
          data: Object.values(standards),
          borderColor: '#27ae60',
          backgroundColor: 'rgba(39, 174, 96, 0.2)',
          borderWidth: 2,
        }
      ]
    };

    setChartData({
      noiseLevels: noiseLevelsData,
      noiseDistribution: noiseDistributionData,
      noiseCategorization: noiseCategorizationData,
      noiseComparison: noiseComparisonData
    });
  }, []); // Remove dependencies that cause re-renders

  useEffect(() => {
    if (sensors && sensors.length > 0) {
      const noiseSensors = sensors.filter(s => s.sensor_type === 'noise');
      if (noiseSensors.length > 0) {
        generateChartData(noiseSensors);
      }
    }
  }, [sensors, generateChartData]); // Remove historicalData dependency

  const calculateStats = () => {
    const noiseSensors = sensors.filter(s => s.sensor_type === 'noise');
    
    const avgNoise = noiseSensors.reduce((sum, s) => 
      sum + (parseFloat(s.noise_db) || 0), 0) / noiseSensors.length;
    
    const maxNoise = Math.max(...noiseSensors.map(s => parseFloat(s.noise_db) || 0));
    const minNoise = Math.min(...noiseSensors.map(s => parseFloat(s.noise_db) || 0));
    
    const quietSensors = noiseSensors.filter(s => 
      getNoiseLevel(parseFloat(s.noise_db) || 0) === 'Quiet').length;
    
    const loudSensors = noiseSensors.filter(s => 
      parseFloat(s.noise_db) > 80).length;
    
    const activeSensors = noiseSensors.filter(s => 
      s.noise_db !== '-' && s.noise_db !== null).length;

    return {
      avgNoise: avgNoise.toFixed(1),
      maxNoise: maxNoise.toFixed(1),
      minNoise: minNoise.toFixed(1),
      quietSensors,
      loudSensors,
      activeSensors,
      overallLevel: getNoiseLevel(avgNoise)
    };
  };

  const stats = calculateStats();

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
    },
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  };

  const radarOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
    },
    scales: {
      r: {
        beginAtZero: true,
        max: 100,
      },
    },
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right',
      },
    },
  };

  return (
    <div>
      <StatsGrid>
        <StatBox color="#e74c3c">
          <StatValue>{stats.avgNoise}</StatValue>
          <StatLabel>Avg Noise (dB)</StatLabel>
        </StatBox>
        <StatBox color="#c0392b">
          <StatValue>{stats.maxNoise}</StatValue>
          <StatLabel>Max Noise (dB)</StatLabel>
        </StatBox>
        <StatBox color="#27ae60">
          <StatValue>{stats.minNoise}</StatValue>
          <StatLabel>Min Noise (dB)</StatLabel>
        </StatBox>
        <StatBox color="#2ecc71">
          <StatValue>{stats.quietSensors}</StatValue>
          <StatLabel>Quiet Areas</StatLabel>
        </StatBox>
        <StatBox color="#8e44ad">
          <StatValue>{stats.loudSensors}</StatValue>
          <StatLabel>Loud Areas (&gt;80dB)</StatLabel>
        </StatBox>
        <StatBox color="#f39c12">
          <StatValue>{stats.activeSensors}</StatValue>
          <StatLabel>Active Sensors</StatLabel>
        </StatBox>
        <StatBox>
          <NoiseIndicator level={stats.overallLevel}>
            {stats.overallLevel}
          </NoiseIndicator>
          <StatLabel style={{marginTop: '8px'}}>Overall Level</StatLabel>
        </StatBox>
      </StatsGrid>

      <VisualsContainer>
        <ChartCard>
          <ChartTitle>🔊 Noise Levels by Sensor</ChartTitle>
          <ChartWrapper>
            {chartData.noiseLevels ? (
              <Line data={chartData.noiseLevels} options={chartOptions} />
            ) : (
              <div style={{display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px', color: '#666'}}>
                Loading noise level data...
              </div>
            )}
          </ChartWrapper>
        </ChartCard>

        <ChartCard>
          <ChartTitle>📊 Noise Level Distribution</ChartTitle>
          <ChartWrapper>
            {chartData.noiseDistribution ? (
              <Bar data={chartData.noiseDistribution} options={chartOptions} />
            ) : (
              <div style={{display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px', color: '#666'}}>
                Loading distribution data...
              </div>
            )}
          </ChartWrapper>
        </ChartCard>

        <ChartCard>
          <ChartTitle>🎯 Noise Categorization</ChartTitle>
          <ChartWrapper>
            {chartData.noiseCategorization ? (
              <Doughnut data={chartData.noiseCategorization} options={doughnutOptions} />
            ) : (
              <div style={{display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px', color: '#666'}}>
                Loading categorization data...
              </div>
            )}
          </ChartWrapper>
        </ChartCard>

        <ChartCard>
          <ChartTitle>📏 Comparison with Standards</ChartTitle>
          <ChartWrapper>
            {chartData.noiseComparison ? (
              <Radar data={chartData.noiseComparison} options={radarOptions} />
            ) : (
              <div style={{display: 'flex', justifyContent: 'center', alignItems: 'center', height: '200px', color: '#666'}}>
                Loading comparison data...
              </div>
            )}
          </ChartWrapper>
        </ChartCard>
      </VisualsContainer>
    </div>
  );
};

export default NoiseVisuals; 