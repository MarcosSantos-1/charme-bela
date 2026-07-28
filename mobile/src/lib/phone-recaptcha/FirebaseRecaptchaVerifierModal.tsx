import React, { Component } from 'react';
import {
  StyleSheet,
  Button,
  View,
  Text,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FirebaseRecaptcha } from './FirebaseRecaptcha';
import type { FirebaseAuthApplicationVerifier, FirebaseWebConfig } from './types';

type Props = {
  firebaseConfig: FirebaseWebConfig;
  firebaseVersion?: string;
  appVerificationDisabledForTesting?: boolean;
  languageCode?: string;
  title?: string;
  cancelLabel?: string;
  attemptInvisibleVerification?: boolean;
};

type State = {
  visible: boolean;
  visibleLoaded: boolean;
  invisibleLoaded: boolean;
  invisibleVerify: boolean;
  invisibleKey: number;
  resolve?: (token: string) => void;
  reject?: (error: Error) => void;
};

/**
 * ApplicationVerifier para Phone Auth do Firebase JS SDK.
 * Usa apenas react-native-webview — sem pods nativos do Firebase.
 * (Substitui o pacote deprecated expo-firebase-recaptcha / expo-firebase-core.)
 */
export class FirebaseRecaptchaVerifierModal
  extends Component<Props, State>
  implements FirebaseAuthApplicationVerifier
{
  static defaultProps = {
    title: 'reCAPTCHA',
    cancelLabel: 'Cancelar',
  };

  state: State = {
    visible: false,
    visibleLoaded: false,
    invisibleLoaded: false,
    invisibleVerify: false,
    invisibleKey: 1,
  };

  static getDerivedStateFromProps(props: Props, state: State) {
    if (!props.attemptInvisibleVerification && state.invisibleLoaded) {
      return { invisibleLoaded: false, invisibleVerify: false };
    }
    return null;
  }

  get type(): string {
    return 'recaptcha';
  }

  async verify(): Promise<string> {
    return new Promise((resolve, reject) => {
      if (this.props.attemptInvisibleVerification) {
        this.setState({ invisibleVerify: true, resolve, reject });
      } else {
        this.setState({ visible: true, visibleLoaded: false, resolve, reject });
      }
    });
  }

  /** Firebase JS SDK pode chamar _reset após o challenge. */
  _reset(..._args: unknown[]): void {}

  private onVisibleLoad = () => this.setState({ visibleLoaded: true });
  private onInvisibleLoad = () => this.setState({ invisibleLoaded: true });

  private onFullChallenge = () => {
    this.setState({ invisibleVerify: false, visible: true });
  };

  private onError = () => {
    this.state.reject?.(new Error('Falha ao carregar o reCAPTCHA'));
    this.setState({ visible: false, invisibleVerify: false });
  };

  private onVerify = (token: string) => {
    this.state.resolve?.(token);
    this.setState((state) => ({
      visible: false,
      invisibleVerify: false,
      invisibleLoaded: false,
      invisibleKey: state.invisibleKey + 1,
    }));
  };

  cancel = () => {
    this.state.reject?.(new Error('reCAPTCHA cancelado'));
    this.setState({ visible: false });
  };

  render() {
    const {
      title = 'reCAPTCHA',
      cancelLabel = 'Cancelar',
      attemptInvisibleVerification,
      ...otherProps
    } = this.props;
    const { visible, visibleLoaded, invisibleLoaded, invisibleVerify, invisibleKey } = this.state;

    return (
      <View style={styles.container}>
        {attemptInvisibleVerification && (
          <FirebaseRecaptcha
            {...otherProps}
            key={`invisible${invisibleKey}`}
            style={styles.invisible}
            onLoad={this.onInvisibleLoad}
            onError={this.onError}
            onVerify={this.onVerify}
            onFullChallenge={this.onFullChallenge}
            invisible
            verify={invisibleLoaded && invisibleVerify}
          />
        )}
        <Modal
          visible={visible}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={this.cancel}
        >
          <SafeAreaView style={styles.modalContainer}>
            <View style={styles.header}>
              <Text style={styles.titleText}>{title}</Text>
              <View style={styles.cancel}>
                <Button title={cancelLabel} onPress={this.cancel} />
              </View>
            </View>
            <View style={styles.content}>
              <FirebaseRecaptcha
                {...otherProps}
                style={styles.content}
                onLoad={this.onVisibleLoad}
                onError={this.onError}
                onVerify={this.onVerify}
              />
              {!visibleLoaded && (
                <View style={styles.loader}>
                  <ActivityIndicator size="large" />
                </View>
              )}
            </View>
          </SafeAreaView>
        </Modal>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: { width: 0, height: 0 },
  invisible: { width: 300, height: 300 },
  modalContainer: { flex: 1 },
  header: {
    backgroundColor: '#FBFBFB',
    height: 44,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomColor: '#CECECE',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  cancel: { position: 'absolute', left: 8, justifyContent: 'center' },
  titleText: { fontWeight: 'bold' },
  content: { flex: 1 },
  loader: {
    ...StyleSheet.absoluteFillObject,
    paddingTop: 20,
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
});
