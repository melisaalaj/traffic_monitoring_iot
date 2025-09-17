import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
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
  TimeScale,
} from 'chart.js';
import { Line, Bar, Doughnut, Scatter } from 'react-chartjs-2';
import { Clock, TrendingUp, MapPin, Gauge, AlertTriangle, Activity, Calendar } from 'lucide-react';
import axios from 'axios';

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
  TimeScale
);

const TrafficContainer = styled.div`
  background: rgba(255, 255, 255, 0.95);
  border-radius: 15px;
  padding: 25px;
  box-shadow: 0 10px 30px rgba(0,0,0,0.2);
  margin: 20px 0;
`;

const DashboardGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(450px, 1fr));
  gap: 20px;
  margin-bottom: 25px;
`;

const MetricsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 15px;
  margin-bottom: 25px;
`;

const MetricCard = styled.div`
  background: white;
  padding: 20px;
  border-radius: 10px;
  box-shadow: 0 3px 12px rgba(0,0,0,0.1);
  border-left: 4px solid ${props => props.color || '#f39c12'};
  text-align: center;
  transition: transform 0.2s ease;

  &:hover {
    transform: translateY(-2px);
  }
`;

const MetricValue = styled.div`
  font-size: 2.2em;
  font-weight: 700;
  color: #2c3e50;
  margin-bottom: 8px;
`;

const MetricLabel = styled.div`
  font-size: 1em;
  color: #7f8c8d;
  font-weight: 500;
`;

const MetricIcon = styled.div`
  color: ${props => props.color || '#f39c12'};
  margin-bottom: 15px;
  display: flex;
  justify-content: center;
`;

const ChartCard = styled.div`
  background: white;
  padding: 25px;
  border-radius: 12px;
  box-shadow: 0 4px 15px rgba(0,0,0,0.1);
  border-top: 4px solid #f39c12;
`;

const ChartTitle = styled.h3`
  color: #2c3e50;
  margin: 0 0 20px 0;
  font-size: 1.3em;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 10px;
`;

const ChartWrapper = styled.div`
  height: 350px;
  position: relative;
`;

const RankingList = styled.div`
  max-height: 300px;
  overflow-y: auto;
`;

const RankingItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 15px;
  margin-bottom: 8px;
  background: ${props => props.rank <= 3 ? '#fff3cd' : '#f8f9fa'};
  border-radius: 8px;
  border-left: 4px solid ${props => {
    if (props.rank === 1) return '#ffd700';
    if (props.rank === 2) return '#c0c0c0';
    if (props.rank === 3) return '#cd7f32';
    return '#95a5a6';
  }};
`;

const RankBadge = styled.span`
  background: ${props => {
    if (props.rank === 1) return '#ffd700';
    if (props.rank === 2) return '#c0c0c0';
    if (props.rank === 3) return '#cd7f32';
    return '#95a5a6';
  }};
  color: white;
  padding: 4px 8px;
  border-radius: 50%;
  font-weight: bold;
  font-size: 0.9em;
  min-width: 25px;
  text-align: center;
`;

const SensorInfo = styled.div`
  flex: 1;
  margin: 0 15px;
`;

const SensorName = styled.div`
  font-weight: 600;
  color: #2c3e50;
`;

const SensorLocation = styled.div`
  font-size: 0.9em;
  color: #7f8c8d;
`;

const MetricDisplay = styled.div`
  text-align: right;
  font-weight: 600;
  color: #f39c12;
`;

const ControlsContainer = styled.div`
  margin-bottom: 20px;
`;

const ControlGroup = styled.div`
  margin-bottom: 12px;
`;

const ControlLabel = styled.div`
  font-size: 0.9em;
  font-weight: 600;
  color: #2c3e50;
  margin-bottom: 6px;
`;

const TimeSelector = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
`;

const TimeButton = styled.button`
  padding: 8px 16px;
  border: 2px solid #f39c12;
  background: ${props => props.active ? '#f39c12' : 'white'};
  color: ${props => props.active ? 'white' : '#f39c12'};
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
  font-size: 0.9em;
  transition: all 0.2s ease;

  &:hover {
    background: ${props => props.active ? '#e67e22' : '#fff3cd'};
  }
`;

const GranularityButton = styled.button`
  padding: 6px 12px;
  border: 2px solid #e67e22;
  background: ${props => props.active ? '#e67e22' : 'white'};
  color: ${props => props.active ? 'white' : '#e67e22'};
  border-radius: 4px;
  cursor: pointer;
  font-weight: 600;
  font-size: 0.8em;
  transition: all 0.2s ease;

  &:hover {
    background: ${props => props.active ? '#d35400' : '#fdeaa7'};
  }
`;

const TrafficMonitoring = ({ sensors, loading, error, onSensorSelect }) => {
  const [timeData, setTimeData] = useState(null);
  const [timePeriod, setTimePeriod] = useState('hour');
  const [granularity, setGranularity] = useState('1min');
  const [timeDataLoading, setTimeDataLoading] = useState(false);
  const [rankings, setRankings] = useState({
    byTraffic: [],
    bySpeed: [],
    byWaitTime: []
  });

  useEffect(() => {
    if (sensors && sensors.length > 0) {
      generateTrafficAnalytics(sensors);
      loadTimeBasedData(timePeriod, granularity);
    }
  }, [sensors, timePeriod, granularity]);

  const loadTimeBasedData = async (period, granularityLevel) => {
    setTimeDataLoading(true);
    try {
      const response = await axios.get(`/api/traffic/historical?period=${period}&granularity=${granularityLevel}`);
      const historicalData = response.data.historical_data;
      
      if (historicalData && historicalData.length > 0) {
        // Group data by time periods
        const groupedData = groupDataByPeriod(historicalData, period, granularityLevel);
        setTimeData(groupedData);
      }
    } catch (err) {
      console.error('Error loading time-based data:', err);
    } finally {
      setTimeDataLoading(false);
    }
  };

  const groupDataByPeriod = (data, period, granularityLevel) => {
    const grouped = {};
    
    data.forEach(item => {
      if (!item.timestamp || item.vehicle_count_per_min === '-') return;
      
      const date = new Date(item.timestamp);
      let timeKey;
      
      // Group by granularity level
      switch(granularityLevel) {
        case '1min':
          timeKey = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
          break;
        case '5min':
          const fiveMinGroup = Math.floor(date.getMinutes() / 5) * 5;
          timeKey = `${date.getHours().toString().padStart(2, '0')}:${fiveMinGroup.toString().padStart(2, '0')}`;
          break;
        case '30min':
          const thirtyMinGroup = Math.floor(date.getMinutes() / 30) * 30;
          timeKey = `${date.getHours().toString().padStart(2, '0')}:${thirtyMinGroup.toString().padStart(2, '0')}`;
          break;
        case '1hour':
          timeKey = `${date.getHours().toString().padStart(2, '0')}:00`;
          break;
        case '1day':
          timeKey = `${date.getMonth()+1}/${date.getDate()}`;
          break;
        default:
          timeKey = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
      }
      
      // Add date prefix for longer periods
      if (period === '2days' || period === 'week') {
        timeKey = `${date.getMonth()+1}/${date.getDate()} ${timeKey}`;
      }
      
      if (!grouped[timeKey]) {
        grouped[timeKey] = [];
      }
      grouped[timeKey].push(parseFloat(item.vehicle_count_per_min) || 0);
    });
    
    // Calculate averages for each time period
    const labels = Object.keys(grouped).sort();
    const avgData = labels.map(label => {
      const values = grouped[label];
      return values.reduce((sum, val) => sum + val, 0) / values.length;
    });
    
    return {
      labels,
      datasets: [
        {
          label: `Average Vehicles/min (${granularityLevel} intervals)`,
          data: avgData,
          borderColor: '#f39c12',
          backgroundColor: 'rgba(243, 156, 18, 0.1)',
          borderWidth: 3,
          fill: true,
          tension: 0.4,
        }
      ]
    };
  };

  const generateTrafficAnalytics = (allSensors) => {
    const trafficSensors = allSensors.filter(s => s.sensor_type === 'traffic_loop');

    // Generate sensor rankings
    const trafficRanking = trafficSensors
      .map(s => ({
        ...s,
        traffic_value: parseFloat(s.vehicle_count_per_min) || 0
      }))
      .sort((a, b) => b.traffic_value - a.traffic_value)
      .slice(0, 10);

    const speedRanking = trafficSensors
      .map(s => ({
        ...s,
        speed_value: parseFloat(s.avg_speed_kmh) || 0
      }))
      .sort((a, b) => b.speed_value - a.speed_value)
      .slice(0, 10);

    const waitTimeRanking = trafficSensors
      .map(s => ({
        ...s,
        wait_value: parseFloat(s.avg_wait_time_s) || 0
      }))
      .sort((a, b) => b.wait_value - a.wait_value)
      .slice(0, 10);

    setRankings({
      byTraffic: trafficRanking,
      bySpeed: speedRanking,
      byWaitTime: waitTimeRanking
    });
  };

  const calculateMetrics = () => {
    const trafficSensors = sensors?.filter(s => s.sensor_type === 'traffic_loop') || [];
    
    const totalVehicles = trafficSensors.reduce((sum, s) => 
      sum + (parseFloat(s.vehicle_count_per_min) || 0), 0);
    
    const avgSpeed = trafficSensors.reduce((sum, s) => 
      sum + (parseFloat(s.avg_speed_kmh) || 0), 0) / trafficSensors.length;
    
    const avgWaitTime = trafficSensors.reduce((sum, s) => 
      sum + (parseFloat(s.avg_wait_time_s) || 0), 0) / trafficSensors.length;
    
    const peakTraffic = Math.max(...trafficSensors.map(s => 
      parseFloat(s.vehicle_count_per_min) || 0));
    
    const activeSensors = trafficSensors.filter(s => 
      s.vehicle_count_per_min !== '-' && s.vehicle_count_per_min !== null).length;

    const congestionLevel = avgSpeed < 30 ? 'High' : avgSpeed < 50 ? 'Medium' : 'Low';

    return {
      totalVehicles: Math.round(totalVehicles),
      avgSpeed: avgSpeed.toFixed(1),
      avgWaitTime: avgWaitTime.toFixed(1),
      peakTraffic: Math.round(peakTraffic),
      activeSensors,
      congestionLevel
    };
  };

  const generateSpeedDistribution = () => {
    const trafficSensors = sensors?.filter(s => s.sensor_type === 'traffic_loop') || [];
    const speedRanges = ['<20', '20-40', '41-60', '61-80', '80+'];
    const counts = [0, 0, 0, 0, 0];

    trafficSensors.forEach(sensor => {
      const speed = parseFloat(sensor.avg_speed_kmh) || 0;
      if (speed < 20) counts[0]++;
      else if (speed <= 40) counts[1]++;
      else if (speed <= 60) counts[2]++;
      else if (speed <= 80) counts[3]++;
      else counts[4]++;
    });

    return {
      labels: speedRanges.map(range => `${range} km/h`),
      datasets: [{
        data: counts,
        backgroundColor: [
          '#e74c3c',
          '#f39c12',
          '#f1c40f',
          '#2ecc71',
          '#27ae60'
        ],
        borderColor: [
          '#c0392b',
          '#e67e22',
          '#f39c12',
          '#27ae60',
          '#229954'
        ],
        borderWidth: 2,
      }]
    };
  };

  const metrics = calculateMetrics();
  const speedDistribution = generateSpeedDistribution();

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

  if (loading) {
    return (
      <TrafficContainer>
        <div style={{ textAlign: 'center', padding: '50px' }}>
          <Activity size={48} color="#f39c12" />
          <h3>Loading Traffic Analytics...</h3>
        </div>
      </TrafficContainer>
    );
  }

  if (error) {
    return (
      <TrafficContainer>
        <div style={{ textAlign: 'center', padding: '50px', color: '#e74c3c' }}>
          <AlertTriangle size={48} />
          <h3>Error Loading Traffic Data</h3>
          <p>{error}</p>
        </div>
      </TrafficContainer>
    );
  }

  return (
    <TrafficContainer>
      <h2 style={{ color: '#2c3e50', marginBottom: '25px', fontSize: '1.8em' }}>
        🚦 Traffic Monitoring
      </h2>

      {/* Key Metrics */}
      <MetricsGrid>
        <MetricCard color="#f39c12">
          <MetricIcon color="#f39c12">
            <Activity size={32} />
          </MetricIcon>
          <MetricValue>{metrics.totalVehicles}</MetricValue>
          <MetricLabel>Total Vehicles/min</MetricLabel>
        </MetricCard>

        <MetricCard color="#2ecc71">
          <MetricIcon color="#2ecc71">
            <Gauge size={32} />
          </MetricIcon>
          <MetricValue>{metrics.avgSpeed}</MetricValue>
          <MetricLabel>Average Speed (km/h)</MetricLabel>
        </MetricCard>

        <MetricCard color="#e74c3c">
          <MetricIcon color="#e74c3c">
            <Clock size={32} />
          </MetricIcon>
          <MetricValue>{metrics.avgWaitTime}</MetricValue>
          <MetricLabel>Avg Wait Time (s)</MetricLabel>
        </MetricCard>

        <MetricCard color="#9b59b6">
          <MetricIcon color="#9b59b6">
            <TrendingUp size={32} />
          </MetricIcon>
          <MetricValue>{metrics.peakTraffic}</MetricValue>
          <MetricLabel>Peak Traffic</MetricLabel>
        </MetricCard>

        <MetricCard color="#3498db">
          <MetricIcon color="#3498db">
            <MapPin size={32} />
          </MetricIcon>
          <MetricValue>{metrics.activeSensors}</MetricValue>
          <MetricLabel>Active Sensors</MetricLabel>
        </MetricCard>

        <MetricCard color={metrics.congestionLevel === 'High' ? '#e74c3c' : metrics.congestionLevel === 'Medium' ? '#f39c12' : '#2ecc71'}>
          <MetricIcon color={metrics.congestionLevel === 'High' ? '#e74c3c' : metrics.congestionLevel === 'Medium' ? '#f39c12' : '#2ecc71'}>
            <AlertTriangle size={32} />
          </MetricIcon>
          <MetricValue>{metrics.congestionLevel}</MetricValue>
          <MetricLabel>Congestion Level</MetricLabel>
        </MetricCard>
      </MetricsGrid>

      {/* Charts Dashboard */}
      <DashboardGrid>
        {/* Traffic by Time of Day */}
        <ChartCard>
           <ChartTitle>
             <Clock size={20} />
             Traffic Volume Over Time
           </ChartTitle>
           <ControlsContainer>
             <ControlGroup>
               <ControlLabel>Time Period:</ControlLabel>
               <TimeSelector>
                 <TimeButton 
                   active={timePeriod === 'hour'} 
                   onClick={() => setTimePeriod('hour')}
                 >
                   1 Hour
                 </TimeButton>
                 <TimeButton 
                   active={timePeriod === 'day'} 
                   onClick={() => setTimePeriod('day')}
                 >
                   1 Day
                 </TimeButton>
                 <TimeButton 
                   active={timePeriod === '2days'} 
                   onClick={() => setTimePeriod('2days')}
                 >
                   2 Days
                 </TimeButton>
                 <TimeButton 
                   active={timePeriod === 'week'} 
                   onClick={() => setTimePeriod('week')}
                 >
                   1 Week
                 </TimeButton>
               </TimeSelector>
             </ControlGroup>
             <ControlGroup>
               <ControlLabel>Granularity:</ControlLabel>
               <TimeSelector>
                 <GranularityButton 
                   active={granularity === '1min'} 
                   onClick={() => setGranularity('1min')}
                 >
                   1 Min
                 </GranularityButton>
                 <GranularityButton 
                   active={granularity === '5min'} 
                   onClick={() => setGranularity('5min')}
                 >
                   5 Min
                 </GranularityButton>
                 <GranularityButton 
                   active={granularity === '30min'} 
                   onClick={() => setGranularity('30min')}
                 >
                   30 Min
                 </GranularityButton>
                 <GranularityButton 
                   active={granularity === '1hour'} 
                   onClick={() => setGranularity('1hour')}
                 >
                   1 Hour
                 </GranularityButton>
                 <GranularityButton 
                   active={granularity === '1day'} 
                   onClick={() => setGranularity('1day')}
                 >
                   1 Day
                 </GranularityButton>
               </TimeSelector>
             </ControlGroup>
           </ControlsContainer>
           <ChartWrapper>
             {timeDataLoading ? (
               <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                 <Activity size={32} color="#f39c12" />
                 <span style={{ marginLeft: '10px' }}>Loading time data...</span>
               </div>
             ) : timeData ? (
               <Line data={timeData} options={chartOptions} />
             ) : (
               <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: '#7f8c8d' }}>
                 No historical data available
               </div>
             )}
           </ChartWrapper>
         </ChartCard>

        {/* Speed Distribution */}
        <ChartCard>
          <ChartTitle>
            <Gauge size={20} />
            Speed Distribution
          </ChartTitle>
          <ChartWrapper>
            <Doughnut 
              data={speedDistribution} 
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'right',
                  },
                },
              }}
            />
          </ChartWrapper>
        </ChartCard>

        {/* Top Traffic Locations */}
        <ChartCard>
          <ChartTitle>
            <TrendingUp size={20} />
            Highest Traffic Sensors
          </ChartTitle>
          <RankingList>
                         {rankings.byTraffic.map((sensor, index) => (
               <RankingItem 
                 key={sensor.sensor_id} 
                 rank={index + 1}
                 onClick={() => onSensorSelect && onSensorSelect(sensor.sensor_id)}
                 style={{ cursor: onSensorSelect ? 'pointer' : 'default' }}
               >
                 <RankBadge rank={index + 1}>{index + 1}</RankBadge>
                 <SensorInfo>
                   <SensorName>{sensor.sensor_id}</SensorName>
                   <SensorLocation>{sensor.road}</SensorLocation>
                 </SensorInfo>
                 <MetricDisplay>
                   {sensor.traffic_value.toFixed(1)} vehicles/min
                 </MetricDisplay>
               </RankingItem>
             ))}
          </RankingList>
        </ChartCard>

        {/* Fastest Speed Locations */}
        <ChartCard>
          <ChartTitle>
            <Gauge size={20} />
            Highest Speed Sensors
          </ChartTitle>
          <RankingList>
                         {rankings.bySpeed.map((sensor, index) => (
               <RankingItem 
                 key={sensor.sensor_id} 
                 rank={index + 1}
                 onClick={() => onSensorSelect && onSensorSelect(sensor.sensor_id)}
                 style={{ cursor: onSensorSelect ? 'pointer' : 'default' }}
               >
                 <RankBadge rank={index + 1}>{index + 1}</RankBadge>
                 <SensorInfo>
                   <SensorName>{sensor.sensor_id}</SensorName>
                   <SensorLocation>{sensor.road}</SensorLocation>
                 </SensorInfo>
                 <MetricDisplay>
                   {sensor.speed_value.toFixed(1)} km/h
                 </MetricDisplay>
               </RankingItem>
             ))}
          </RankingList>
        </ChartCard>
      </DashboardGrid>
    </TrafficContainer>
  );
};

export default TrafficMonitoring; 