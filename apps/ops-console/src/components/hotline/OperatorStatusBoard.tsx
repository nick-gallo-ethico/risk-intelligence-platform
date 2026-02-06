import { Phone, Coffee, PhoneOff, Globe, User, PhoneCall } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

interface OperatorStatus {
  operatorId: string;
  status: string;
  languages?: string[];
  currentCallId?: string;
  updatedAt: string;
}

interface OperatorStatusBoardProps {
  data: {
    available: number;
    onCall: number;
    onBreak: number;
    offline: number;
    operators: OperatorStatus[];
  };
}

const statusConfig: Record<
  string,
  { icon: typeof Phone; color: string; bgColor: string; label: string }
> = {
  AVAILABLE: {
    icon: Phone,
    color: 'text-green-600',
    bgColor: 'bg-green-500',
    label: 'Available',
  },
  ON_CALL: {
    icon: PhoneCall,
    color: 'text-blue-600',
    bgColor: 'bg-blue-500',
    label: 'On Call',
  },
  ON_BREAK: {
    icon: Coffee,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-500',
    label: 'On Break',
  },
  OFFLINE: {
    icon: PhoneOff,
    color: 'text-gray-400',
    bgColor: 'bg-gray-400',
    label: 'Offline',
  },
};

export function OperatorStatusBoard({ data }: OperatorStatusBoardProps) {
  // Group operators by status for organized display
  const operatorsByStatus = data.operators.reduce(
    (acc: Record<string, OperatorStatus[]>, op) => {
      const status = op.status || 'OFFLINE';
      if (!acc[status]) acc[status] = [];
      acc[status].push(op);
      return acc;
    },
    {}
  );

  const totalOperators = data.operators.length;

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="p-5 bg-white border rounded-lg shadow-sm">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-100 rounded-lg">
              <Phone className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <div className="text-3xl font-bold text-green-600">{data.available}</div>
              <div className="text-sm text-gray-500">Available</div>
            </div>
          </div>
        </div>

        <div className="p-5 bg-white border rounded-lg shadow-sm">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-100 rounded-lg">
              <PhoneCall className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <div className="text-3xl font-bold text-blue-600">{data.onCall}</div>
              <div className="text-sm text-gray-500">On Call</div>
            </div>
          </div>
        </div>

        <div className="p-5 bg-white border rounded-lg shadow-sm">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-yellow-100 rounded-lg">
              <Coffee className="h-6 w-6 text-yellow-600" />
            </div>
            <div>
              <div className="text-3xl font-bold text-yellow-600">{data.onBreak}</div>
              <div className="text-sm text-gray-500">On Break</div>
            </div>
          </div>
        </div>

        <div className="p-5 bg-white border rounded-lg shadow-sm">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gray-100 rounded-lg">
              <PhoneOff className="h-6 w-6 text-gray-500" />
            </div>
            <div>
              <div className="text-3xl font-bold text-gray-500">{data.offline}</div>
              <div className="text-sm text-gray-500">Offline</div>
            </div>
          </div>
        </div>
      </div>

      {/* Capacity indicator */}
      <div className="bg-white border rounded-lg p-4 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">Current Capacity</span>
          <span className="text-sm text-gray-500">
            {data.available} of {totalOperators} available
          </span>
        </div>
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-green-500 transition-all duration-500"
            style={{ width: `${totalOperators > 0 ? (data.available / totalOperators) * 100 : 0}%` }}
          />
        </div>
      </div>

      {/* Operator grid by status */}
      <div className="bg-white border rounded-lg shadow-sm overflow-hidden">
        <div className="p-4 border-b bg-gray-50">
          <h3 className="font-medium">All Operators ({totalOperators})</h3>
        </div>

        {totalOperators === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <User className="h-10 w-10 mx-auto mb-2 text-gray-300" />
            <p>No operators currently tracked</p>
          </div>
        ) : (
          <div className="p-4 space-y-6">
            {/* Available operators first, then on call, on break, offline */}
            {['AVAILABLE', 'ON_CALL', 'ON_BREAK', 'OFFLINE'].map((statusKey) => {
              const operators = operatorsByStatus[statusKey] || [];
              if (operators.length === 0) return null;

              const config = statusConfig[statusKey];

              return (
                <div key={statusKey}>
                  <h4 className={cn('text-sm font-medium mb-3', config.color)}>
                    {config.label} ({operators.length})
                  </h4>
                  <div className="grid grid-cols-4 gap-3">
                    {operators.map((op) => {
                      const Icon = config.icon;
                      return (
                        <div
                          key={op.operatorId}
                          className="p-3 border rounded-lg flex items-start gap-3 hover:bg-gray-50 transition-colors"
                        >
                          <div className={cn('w-2.5 h-2.5 rounded-full mt-1.5', config.bgColor)} />
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm truncate" title={op.operatorId}>
                              {op.operatorId}
                            </div>
                            <div className="text-xs text-gray-500 mt-0.5">
                              {formatDistanceToNow(new Date(op.updatedAt), { addSuffix: true })}
                            </div>
                            {op.languages && op.languages.length > 0 && (
                              <div className="flex items-center gap-1 mt-1.5">
                                <Globe className="h-3 w-3 text-gray-400" />
                                <span className="text-xs text-gray-500 truncate">
                                  {op.languages.join(', ')}
                                </span>
                              </div>
                            )}
                            {op.currentCallId && statusKey === 'ON_CALL' && (
                              <div className="mt-1.5 text-xs text-blue-600">
                                Call: {op.currentCallId.slice(0, 8)}...
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
