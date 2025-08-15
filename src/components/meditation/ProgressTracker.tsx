"use client";

import React from 'react';

interface MeditationProgress {
  date: string;
  duration: number;
  type: string;
  stressReduction: number;
  breathingImprovement: number;
}

interface WellnessProgress {
  date: string;
  duration: number;
  type: string;
  postureImprovement: number;
  sessionQuality: number;
}

type ProgressData = MeditationProgress | WellnessProgress;

interface ProgressTrackerProps {
  progress: ProgressData[];
  currentStreak: number;
  totalSessions: number;
  totalMinutes: number;
}

export default function ProgressTracker({ 
  progress, 
  currentStreak, 
  totalSessions, 
  totalMinutes 
}: ProgressTrackerProps) {
  const formatDuration = (minutes: number): string => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  const getStreakEmoji = (streak: number): string => {
    if (streak >= 7) return '🔥';
    if (streak >= 3) return '⚡';
    if (streak >= 1) return '✨';
    return '🌱';
  };

  const getProgressMetric = (session: ProgressData): { label: string; value: string; color: string } => {
    if ('stressReduction' in session) {
      // Meditation progress
      return {
        label: 'Stress Reduction',
        value: `-${Math.round(session.stressReduction * 100)}%`,
        color: 'text-purple-600'
      };
    } else {
      // Wellness progress
      return {
        label: 'Posture Improvement',
        value: `+${Math.round(session.postureImprovement)}%`,
        color: 'text-blue-600'
      };
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold mb-4 text-gray-800">Your Progress</h2>
      
      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="text-center">
          <div className="text-2xl font-bold text-purple-600">{currentStreak}</div>
          <div className="text-sm text-gray-600">Day Streak</div>
          <div className="text-lg">{getStreakEmoji(currentStreak)}</div>
        </div>
        
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600">{totalSessions}</div>
          <div className="text-sm text-gray-600">Total Sessions</div>
        </div>
        
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">{formatDuration(totalMinutes)}</div>
          <div className="text-sm text-gray-600">Total Time</div>
        </div>
        
        <div className="text-center">
          <div className="text-2xl font-bold text-orange-600">
            {totalSessions > 0 ? Math.round(totalMinutes / totalSessions) : 0}
          </div>
          <div className="text-sm text-gray-600">Avg Session</div>
        </div>
      </div>

      {/* Recent Sessions */}
      <div>
        <h3 className="text-lg font-medium mb-3 text-gray-700">Recent Sessions</h3>
        
        {progress.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <div className="text-4xl mb-2">📊</div>
            <p>Complete your first session to see progress</p>
          </div>
        ) : (
          <div className="space-y-3">
            {progress.slice(0, 5).map((session, index) => {
              const metric = getProgressMetric(session);
              return (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-blue-600 text-sm font-medium">
                        {session.type.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <div className="font-medium text-gray-800">{session.type}</div>
                      <div className="text-sm text-gray-600">{session.date}</div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="font-medium text-gray-800">{formatDuration(session.duration)}</div>
                    <div className={`text-xs ${metric.color} mt-1`}>
                      {metric.label}: {metric.value}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Progress Chart Placeholder */}
      <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
        <h3 className="text-lg font-medium mb-2 text-gray-700">Weekly Progress</h3>
        <div className="h-32 bg-white rounded border-2 border-dashed border-gray-300 flex items-center justify-center">
          <div className="text-center text-gray-500">
            <div className="text-2xl mb-1">📈</div>
            <p className="text-sm">Progress charts coming soon!</p>
          </div>
        </div>
      </div>
    </div>
  );
}
