import { bindActions } from "../../store/bindActions";
import { enumUniq } from "../../utils/enumUniq";
import { ISettingsState } from "./settings.types";
import { AppState, storage } from "../../store";

export enum actionTypes {
  SETTINGS_SYNC
}

enumUniq(actionTypes);

export const settingsActions = bindActions({
  async sync(settings: ISettingsState) {
    return await function (dispatch, getState) {
      dispatch({
        type: actionTypes.SETTINGS_SYNC,
        data: settings
      });
      var state: AppState = getState();
      return storage.sync.set({ settings: state.settings });
    }
  }
});
