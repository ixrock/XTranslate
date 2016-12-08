import { bindActions, ActionsDispatcher } from '../../store/bindActions'
import { enumUniq } from '../../utils/enumUniq'
import { ISettingsState } from './settings.types'
import { AppState, storage } from '../../store'

export enum actionTypes {
  SETTINGS_SYNC
}

enumUniq(actionTypes);

@bindActions
class SettingsActions extends ActionsDispatcher {
  sync(settings: ISettingsState) {
    return function (dispatch, getState) {
      dispatch({
        type: actionTypes.SETTINGS_SYNC,
        data: settings
      });
      var state: AppState = getState();
      storage.sync.set({ settings: state.settings });
    }
  }
}

export const settingsActions = new SettingsActions();
export default settingsActions;