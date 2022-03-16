import React, { Component, useCallback, useState, useEffect } from 'react';
import { Share, Alert, View, TouchableOpacity, Text, Modal, Linking } from 'react-native';

//redux
import { connect, useDispatch } from 'react-redux';
import { bindActionCreators } from 'redux';
import { dispatchCustomModalMessage, dispatchCustomModalStatus } from '../../../utils/CommonUtils'

//component
import Strings from '../../../utils/Strings';
import HeaderComponents from './HeaderComponents';
import AppTheme from '../../../utils/AppTheme';
import { collectErrorLogs } from '../../CollectErrorLogs';
import saralAppInfo from '../../../../saralAppInfo.json'

//Api action
import { SaveScanData } from '../../../flux/actions/apis/saveScanDataAction';
import APITransport from '../../../flux/actions/transport/apitransport';
import { LogoutAction } from '../../../flux/actions/apis/LogoutAction';

//npm
import axios from 'axios';

//local storage
import { getScannedDataFromLocal, eraseErrorLogs, getErrorMessage } from '../../../utils/StorageUtils';

//constant
import C from '../../../flux/actions/constants'
import { monospace_FF } from '../../../utils/CommonUtils';


const ShareComponent = ({
  loginData,
  message,
  navigation,
  multiBrandingData,
  bgFlag
}) => {
  const [ishidden, setIshidden] = useState(false)
  const dispatch = useDispatch()

  const callCustomModal = (title, message, isAvailable, doLogout, cancel) => {
    let data = {
        title: title,
        message: message,
        isOkAvailable: isAvailable,
        okFunc: doLogout,
        isCancel : cancel
    }
    dispatch(dispatchCustomModalStatus(true));
    dispatch(dispatchCustomModalMessage(data));
}

  const Logoutcall = async () => {
    let data = await getScannedDataFromLocal();
    setIshidden(false);
    if (bgFlag) {
      callCustomModal(Strings.message_text,Strings.auto_sync_in_progress_please_wait,false,false);
    } else {

      const doLogout = async () => {
        if (data != null && data.length > 0) {
          for (const value of data) {
            let apiObj = new SaveScanData(value, loginData.data.token);
            saveStudentData(apiObj)
          }
        } else {
          await eraseErrorLogs()
          dispatch(LogoutAction())
          navigation.navigate('auth')
        }
      }

      callCustomModal(Strings.message_text, Strings.are_you_sure_you_want_to_logout, true , doLogout, true)

    }
  }


  const saveStudentData = async (api) => {
    if (api.method === 'PUT') {
      let apiResponse = null
      const source = axios.CancelToken.source()
      const id = setTimeout(() => {
        if (apiResponse === null) {
          source.cancel('The request timed out.');
        }
      }, 60000);
      axios.put(api.apiEndPoint(), api.getBody(), { headers: api.getHeaders(), cancelToken: source.token },)
        .then(function (res) {
          dispatch(LogoutAction())
          navigation.navigate('auth')
          apiResponse = res
          clearTimeout(id)
          api.processResponse(res)
        })
        .catch(function (err) {
          collectErrorLogs("Share.js", "saveStudentData", api.apiEndPoint(), err, false)
          callCustomModal(Strings.message_text,Strings.something_went_wrong_please_try_again,false,false);
          clearTimeout(id)
        });
    }
  }


  const ShareCompo = async () => {
    const message = await getErrorMessage()
    const errorMessage = JSON.stringify(message, null, 2)
    try {
      const result = await Share.share({
        title: `Saral App v1.0 logs collection`,
        message:
          `${errorMessage ? errorMessage : ''}`

      });
      if (result.action === Share.sharedAction) {
        if (result.activityType) {
          setIshidden(false);
          // shared with activity type of result.activityType
          
        } else {
          setIshidden(false);
          // shared
        }
      }
    } catch (error) {
      callCustomModal(Strings.message_text,Strings.shareDataExceed,false,false);
      // alert(error.message);
    }
  }

  const dispatchModalStatus = (value) => {
    return({
      type: C.MODAL_STATUS,
      payload : value
    })
  }

  const dispatchModalMessage = (value) => {
    return({
      type: C.MODAL_MESSAGE,
      payload : value
    })
  }

  const aboutMenu = () => {
    setIshidden(false);
    dispatch(dispatchModalStatus(true))
    dispatch(dispatchModalMessage(saralAppInfo))
  }
  const helpMenu = () => {
    setIshidden(false);
    Linking.openURL("https://saral.sunbird.org/learn/features")
  }

  const showModal = () => {
    setIshidden(!ishidden);
  };
  return (
    <View style={{ width: '-10%' }}>

      <View style={styles.imageViewContainer}>

        <TouchableOpacity onPress={() => showModal()}>
          <View style={[styles.imageContainerStyle, { backgroundColor: multiBrandingData ? multiBrandingData.themeColor2 : AppTheme.LIGHT_BLUE }]}>
            <Text style={{ textAlign: 'center', fontSize: AppTheme.HEADER_FONT_SIZE_LARGE,fontFamily : monospace_FF }}>{loginData.data.school.name.charAt(0)}</Text>
          </View>
        </TouchableOpacity>
      </View>


      <Modal
        animationType="fade"
        transparent={true}
        visible={ishidden}
        onRequestClose={() => {
          setIshidden(false)
        }}>
        <TouchableOpacity
          onPress={() => setIshidden(false)}
          style={styles.bgContainer}
          activeOpacity={1}
        >

            <HeaderComponents
              supportTeamText={'Support'}
              logoutHeaderText={Strings.logout_text}
              customLogoutTextStyle={{ color: AppTheme.BLACK, }}
              onSupportClick={ShareCompo}
              onLogoutClick={Logoutcall}
              aboutMenu={aboutMenu}
              helpMenu={helpMenu}
            />

        </TouchableOpacity>
      </Modal>
    </View>
  )
}


const mapStateToProps = (state) => {
  return {
    ocrLocalResponse: state.ocrLocalResponse,
    loginData: state.loginData,
    studentsAndExamData: state.studentsAndExamData,
    scanTypeData: state.scanTypeData.response,
    apiStatus: state.apiStatus,
    roiData: state.roiData,
    absentStudentDataResponse: state.absentStudentDataResponse,
    getScanStatusData: state.getScanStatusData,
    multiBrandingData: state.multiBrandingData.response.data,
    bgFlag: state.bgFlag
  }
}

const mapDispatchToProps = (dispatch) => {
  return bindActionCreators({
    APITransport: APITransport,
    LogoutAction: LogoutAction
  }, dispatch)
}

const styles = {

  imageViewContainer: {

    alignItems: 'flex-end',
    backgroundColor: '#fff'
    // justifyContent:'center'
  },
  imageContainerStyle: {
    padding: 5,
    marginRight: 10,
    height: 50,
    width: 50,
    borderRadius: 45,
    borderWidth: 1,
    borderColor: AppTheme.TAB_BORDER,
    justifyContent: 'center',
    backgroundColor: AppTheme.TAB_BORDER
  },
  bgContainer: {
    backgroundColor: '#ffffff1A',
    flex: 1,
  }
}

export default (connect(mapStateToProps, mapDispatchToProps)(ShareComponent));