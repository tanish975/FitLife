import React, { useMemo } from 'react';
import { Card } from 'react-bootstrap';
import { BarChart, Bar, XAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import MotionCard from '../animations/MotionCard';

export default function AnalyticsCharts({ data = [] }) {
    // Memoize the check for efficiency
    const hasData = useMemo(() => Array.isArray(data) && data.some(d => d.calories > 0), [data]);

    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white p-2 border border-0 shadow-sm rounded-3">
                    <p className="mb-0 fw-bold small text-muted">{label}</p>
                    <p className="mb-0 fw-bold text-primary">{payload[0].value} kcal</p>
                </div>
            );
        }
        return null;
    };

    return (
        <MotionCard noTilt className="h-100 border-0 shadow-sm overflow-hidden">
            <Card.Body className="p-4">
                <h6 className="fw-800 mb-4 opacity-75 text-uppercase ls-1" style={{ fontSize: '0.75rem', letterSpacing: '1px' }}>
                    Calorie Consistency
                </h6>
                <div style={{ height: '180px', width: '100%' }} className="position-relative">
                    {!hasData && (
                        <div className="position-absolute top-50 start-50 translate-middle text-center w-100 opacity-50 z-3" style={{ pointerEvents: 'none' }}>
                            <p className="small mb-0">No entries yet this week.</p>
                            <p className="text-muted" style={{ fontSize: '0.7rem' }}>Log your meals to see trends!</p>
                        </div>
                    )}
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
                            <CartesianGrid vertical={false} strokeDasharray="3 3" opacity={0.1} />
                            <XAxis
                                dataKey="day"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fontSize: 10, fontWeight: 700 }}
                            />
                            <RechartsTooltip cursor={{ fill: 'transparent' }} content={<CustomTooltip />} />
                            <Bar
                                dataKey="calories"
                                fill="#10b981"
                                radius={[4, 4, 0, 0]}
                                barSize={20}
                                opacity={hasData ? 1 : 0.2}
                            />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </Card.Body>
        </MotionCard>
    );
}
