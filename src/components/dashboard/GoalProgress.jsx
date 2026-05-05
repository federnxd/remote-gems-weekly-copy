import React from 'react';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Target } from 'lucide-react';

export default function GoalProgress({ posts }) {
  const totalHired = posts.reduce((s, p) => s + (p.hired || 0), 0);
  const goal = 100;
  const progress = Math.min((totalHired / goal) * 100, 100);

  return (
    <Card className="p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-9 h-9 rounded-xl bg-accent/10 flex items-center justify-center">
          <Target className="w-5 h-5 text-accent" />
        </div>
        <div>
          <h3 className="font-semibold text-sm">Monthly Goal</h3>
          <p className="text-xs text-muted-foreground">100 hired referrals</p>
        </div>
      </div>
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="font-mono text-lg font-bold">{totalHired}</span>
          <span className="text-muted-foreground">/ {goal}</span>
        </div>
        <Progress value={progress} className="h-3" />
        <p className="text-xs text-muted-foreground text-center">
          {progress.toFixed(0)}% complete — {goal - totalHired} more to go
        </p>
      </div>
    </Card>
  );
}