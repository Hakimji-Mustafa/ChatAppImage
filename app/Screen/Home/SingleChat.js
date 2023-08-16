//import liraries
import database from '@react-native-firebase/database';
import moment from 'moment';
import React, {useEffect} from 'react';
import {
  FlatList,
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {Icon} from 'react-native-elements';
import SimpleToast from 'react-native-simple-toast';
import {useSelector} from 'react-redux';
import MsgComponent from '../../Component/Chat/MsgComponent';
import {COLORS} from '../../Component/Constant/Color';
import ChatHeader from '../../Component/Header/ChatHeader';
import ImagePicker from 'react-native-image-crop-picker';
import storage from '@react-native-firebase/storage';
import {launchImageLibrary} from 'react-native-image-picker';

const SingleChat = props => {
  const {userData} = useSelector(state => state.User);

  const {receiverData} = props.route.params;

  // console.log('receiverData', receiverData);

  const [msg, setMsg] = React.useState('');
  const [disabled, setdisabled] = React.useState(false);
  const [allChat, setallChat] = React.useState([]);

  useEffect(() => {
    const onChildAdd = database()
      .ref('/messages/' + receiverData.roomId)
      .on('child_added', snapshot => {
        // console.log('A new node has been added', snapshot.val());
        setallChat(state => [snapshot.val(), ...state]);
      });
    // Stop listening for updates when no longer required
    return () =>
      database()
        .ref('/messages' + receiverData.roomId)
        .off('child_added', onChildAdd);
  }, [receiverData.roomId]);

  const msgvalid = txt => txt && txt.replace(/\s/g, '').length;

  const sendMsg = () => {
    if (msg == '' || msgvalid(msg) == 0) {
      SimpleToast.show('Enter something....');
      return false;
    }
    setdisabled(true);
    let msgData = {
      roomId: receiverData.roomId,
      message: msg,
      from: userData?.id,
      to: receiverData.id,
      sendTime: moment().format(''),
      msgType: 'text',
    };
    updateMessagesToFirebase(msgData);
  };

  const updateMessagesToFirebase = async msgData => {
    const newReference = database()
      .ref('/messages/' + receiverData.roomId)
      .push();
    msgData.id = newReference.key;
    newReference.set(msgData).then(() => {
      let chatListupdate = {
        lastMsg: msgData.message,
        sendTime: msgData.sendTime,
        msgType: msgData.msgType,
      };
      database()
        .ref('/chatlist/' + receiverData?.id + '/' + userData?.id)
        .update(chatListupdate)
        .then(() => console.log('Data updated.'));
      database()
        .ref('/chatlist/' + userData?.id + '/' + receiverData?.id)
        .update(chatListupdate)
        .then(() => console.log('Data updated.'));

      setMsg('');
      setdisabled(false);
    });
  };

  const uploadImage = async () => {
    // here i am creating the Options object which I will then pass in the LaunchLibrary method.
    const options = {
      mediaType: 'photo',
      selectionLimit: 1,
    };

    //Process of Uploading andy Image to teh Firebase Database
    // Here we are using the Image Picker Library to pick the Image from the gallary
    launchImageLibrary(options).then(async image => {
      // here i am creating the image name by taking only the Image name by getting the last index og "/".
      // because after the last slash the real image name is written.
      let imgName = image?.assets[0]?.uri?.substring(
        image?.assets[0]?.uri?.lastIndexOf('/') + 1,
      );
      // Here I am passing the new extention name for the Image.
      // I am splitting the image name from the "." dot because now we have the only image name and the extension after the "." dot.
      //So the pop() method of array will return me the last element. In this which is the extension name after the "." dot.
      let ext = imgName?.split('.').pop();

      // Here i am taking out the name by getting the 0 index element, which will be the name.
      let name = imgName?.split('.')[0];

      //Here I am adding the current time of message sent and then in the end i am adding the extension.
      // So we can display the Image in a row of time. In a sequence.
      let newName = name + Date.now() + '.' + ext;

      // here i am creating a new list name "chatMedia" to store the users sent Images.
      const reference = storage().ref(`chatMedia/${newName}`);

      // Here I am using the putFile method to put the file inside the Storage.
      // This method is only responsible Upload the image into the firebase above I am adding the time to display in the message only In the proper sequence.
      await reference?.putFile(image?.assets[0]?.uri?.toString());

      // Now I am creating taking the URL of the Uploaded Image to put ibn the messages to display the image in the Chat section.
      const imgUrl = await storage()
        .ref(`chatMedia/${newName}`)
        .getDownloadURL();

      // here I am creating a new Object fro the images Chat where In the same RoomId I am adding the image and its time to display the Image Component.
      // in this Object I am changing the message type to image and on the basis of that type I will show the image component in the chat Section.
      let msgData = {
        roomId: receiverData.roomId,
        message: imgUrl,
        from: userData?.id,
        to: receiverData.id,
        sendTime: moment().format(''),
        msgType: 'image',
      };
      // here i am calling the UpdateMessage function which will update the message to the ChatList and both users messages as well.
      updateMessagesToFirebase(msgData);
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <ChatHeader data={receiverData} />
      <KeyboardAvoidingView
        style={{flex: 1}}
        behavior={Platform.OS == 'ios' ? 'padding' : null}>
        <ImageBackground
          source={require('../../Assets/Background.jpg')}
          style={{flex: 1}}>
          <FlatList
            style={{flex: 1}}
            data={allChat}
            showsVerticalScrollIndicator={false}
            keyExtractor={(item, index) => index}
            inverted
            renderItem={({item}) => {
              return (
                <MsgComponent sender={item.from == userData.id} item={item} />
              );
            }}
          />
        </ImageBackground>

        <View
          style={{
            backgroundColor: COLORS.theme,
            elevation: 5,
            flexDirection: 'row',
            alignItems: 'center',
            paddingVertical: 7,
            justifyContent: 'space-evenly',
            paddingHorizontal: 10,
          }}>
          <TextInput
            style={{
              backgroundColor: COLORS.white,
              width: '80%',
              borderRadius: 25,
              borderWidth: 0.5,
              borderColor: COLORS.white,
              paddingHorizontal: 15,
              color: COLORS.black,
              height: 48,
              paddingTop: Platform.OS == 'ios' ? 15 : 0,
            }}
            placeholder="type a message"
            placeholderTextColor={COLORS.black}
            multiline={true}
            numberOfLines={5}
            value={msg}
            onChangeText={val => setMsg(val)}
          />

          <TouchableOpacity disabled={disabled} onPress={uploadImage}>
            <Icon color={COLORS.white} name="attach-outline" type="ionicon" />
          </TouchableOpacity>

          <TouchableOpacity disabled={disabled} onPress={sendMsg}>
            <Icon
              color={COLORS.white}
              name="paper-plane-sharp"
              type="ionicon"
            />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

// define your styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.theme,
  },
});

//make this component available to the app
export default SingleChat;
