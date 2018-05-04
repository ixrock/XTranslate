import { bindActions } from "../../store/bindActions";
import { enumUniq } from "../../utils/enumUniq";
import { ISettingsState } from "./settings.types";
import { storage } from "../../store/storage";
import { IAppState } from "../../store/store.types";

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
      var state: IAppState = getState();
      return storage.sync.set({ settings: state.settings });
    }
  }
});
