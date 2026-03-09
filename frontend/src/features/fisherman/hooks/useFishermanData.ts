import { useEffect, useState } from 'react';
import { fetchFishermanDashboardData } from '../services/fishermanDataService';
import type {
  FishermanAlert,
  FishermanNotice,
  FishermanProfile,
  FishermanTrip,
} from '../types/fishermanData';

export type {
  FishermanAlert,
  FishermanNotice,
  FishermanProfile,
  FishermanTrip,
} from '../types/fishermanData';

interface FishermanDataState {
  loading: boolean;
  error: string | null;
  profile: FishermanProfile | null;
  activeTrip: FishermanTrip | null;
  tripHistory: FishermanTrip[];
  notices: FishermanNotice[];
  alerts: FishermanAlert[];
}

const initialState: FishermanDataState = {
  loading: true,
  error: null,
  profile: null,
  activeTrip: null,
  tripHistory: [],
  notices: [],
  alerts: [],
};

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Failed to load dashboard data.';
}

export function useFishermanData() {
  const [state, setState] = useState<FishermanDataState>(initialState);

  useEffect(() => {
    let isCurrentRequest = true;

    void (async () => {
      try {
        const dashboardData = await fetchFishermanDashboardData();

        if (!isCurrentRequest) {
          return;
        }

        setState({
          loading: false,
          error: null,
          ...dashboardData,
        });
      } catch (error) {
        if (!isCurrentRequest) {
          return;
        }

        setState((current) => ({
          ...current,
          loading: false,
          error: getErrorMessage(error),
        }));
      }
    })();

    return () => {
      isCurrentRequest = false;
    };
  }, []);

  return state;
}
