import { useCallback, useEffect, useMemo, useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../../../firebase/config/firebaseClient';

export type FishermanStatusFilter = 'all' | 'active' | 'inactive';

export interface FishermanListItem {
  uid: string;
  displayName: string;
  phoneNumber: string | null;
  homeHarborId: string | null;
  isActive: boolean;
  role: string;
}

export interface FishermanVesselItem {
  vesselId: string;
  vesselName: string;
  registrationNumber: string | null;
  status: string | null;
}

interface FishermanDetailResponse {
  fisherman: FishermanListItem;
  vessels: FishermanVesselItem[];
}

export interface FishermanFormValues {
  uid?: string;
  displayName: string;
  phoneNumber: string;
  homeHarborId: string;
  isActive: boolean;
}

interface UseFishermanManagementState {
  loading: boolean;
  submitting: boolean;
  error: string | null;
  fishermen: FishermanListItem[];
  selected: FishermanListItem | null;
  selectedVessels: FishermanVesselItem[];
}

const initialState: UseFishermanManagementState = {
  loading: true,
  submitting: false,
  error: null,
  fishermen: [],
  selected: null,
  selectedVessels: []
};

function getMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return 'Something went wrong while loading fisherman data.';
}

export function useFishermanManagement() {
  const [state, setState] = useState<UseFishermanManagementState>(initialState);
  const [search, setSearch] = useState('');
  const [harborFilter, setHarborFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<FishermanStatusFilter>('all');

  const listFishermen = useMemo(() => httpsCallable(functions, 'listFishermen'), []);
  const getFishermanDetail = useMemo(() => httpsCallable(functions, 'getFishermanDetail'), []);
  const createFisherman = useMemo(() => httpsCallable(functions, 'createFisherman'), []);
  const updateFisherman = useMemo(() => httpsCallable(functions, 'updateFisherman'), []);

  const loadList = useCallback(async () => {
    setState((current) => ({ ...current, loading: true, error: null }));

    try {
      const response = await listFishermen({
        search,
        harborId: harborFilter,
        status: statusFilter === 'all' ? '' : statusFilter
      });
      const fishermen = ((response.data as { fishermen?: FishermanListItem[] }).fishermen ?? []).sort((a, b) =>
        a.displayName.localeCompare(b.displayName),
      );

      setState((current) => {
        const selected = current.selected
          ? fishermen.find((fisherman) => fisherman.uid === current.selected?.uid) ?? null
          : null;

        return {
          ...current,
          loading: false,
          fishermen,
          selected,
          selectedVessels: selected ? current.selectedVessels : [],
          error: null
        };
      });
    } catch (error) {
      setState((current) => ({ ...current, loading: false, error: getMessage(error) }));
    }
  }, [harborFilter, listFishermen, search, statusFilter]);

  const loadDetail = useCallback(
    async (fishermanUid: string) => {
      setState((current) => ({ ...current, loading: true, error: null }));

      try {
        const response = await getFishermanDetail({ fishermanUid });
        const data = response.data as FishermanDetailResponse;

        setState((current) => ({
          ...current,
          loading: false,
          selected: data.fisherman,
          selectedVessels: data.vessels,
          error: null
        }));
      } catch (error) {
        setState((current) => ({ ...current, loading: false, error: getMessage(error) }));
      }
    },
    [getFishermanDetail],
  );

  const saveFisherman = useCallback(
    async (values: FishermanFormValues, selectedUid?: string | null) => {
      setState((current) => ({ ...current, submitting: true, error: null }));

      try {
        if (selectedUid) {
          await updateFisherman({
            fishermanUid: selectedUid,
            displayName: values.displayName,
            phoneNumber: values.phoneNumber,
            homeHarborId: values.homeHarborId,
            isActive: values.isActive
          });
          await loadDetail(selectedUid);
        } else {
          await createFisherman({
            uid: values.uid,
            displayName: values.displayName,
            phoneNumber: values.phoneNumber,
            homeHarborId: values.homeHarborId,
            isActive: values.isActive
          });
          if (values.uid) {
            await loadDetail(values.uid);
          }
        }

        await loadList();
        setState((current) => ({ ...current, submitting: false }));
      } catch (error) {
        setState((current) => ({ ...current, submitting: false, error: getMessage(error) }));
      }
    },
    [createFisherman, loadDetail, loadList, updateFisherman],
  );

  useEffect(() => {
    void loadList();
  }, [loadList]);

  return {
    ...state,
    search,
    harborFilter,
    statusFilter,
    setSearch,
    setHarborFilter,
    setStatusFilter,
    loadList,
    loadDetail,
    saveFisherman,
    clearSelection: () => setState((current) => ({ ...current, selected: null, selectedVessels: [] }))
  };
}
