
import * as React from 'react';
import { Image, Pressable, Text, View, useWindowDimensions } from 'react-native';

function Logo() {
  const { width } = useWindowDimensions();
  const size = Math.min(Math.max(width * 0.5, 120), 260);

  return (
    <Image
      source={require('../../theme/logo.png')}
      style={{ width: size, height: size }}
      resizeMode="contain"
    />
  );
}

function OrDivider() {
  return (
    <View className="my-2.5 w-full flex-row items-center px-1">
      <View className="h-[1px] flex-1 bg-[#C9B8A8]" />
      <Text className="mx-3.5 text-sm text-button-primary">ou</Text>
      <View className="h-[1px] flex-1 bg-[#C9B8A8]" />
    </View>
  );
}

export type WelcomeScreenProps = {
  onCreateAccount: () => void;
  onLogin: () => void;
};

export function WelcomeScreen({ onCreateAccount, onLogin }: WelcomeScreenProps) {
  return (
    <View className="flex-1 items-center justify-between bg-[#F4F0F8] pb-[52px]">
      <View className="flex-1 items-center justify-center pb-8 pt-12">
        <Logo />
        <Text className="mt-5 text-[26px] font-extrabold tracking-[2.5px] text-button-primary">
          ADMINISTRANEST
        </Text>
        <Text className="mt-1.5 text-[15px] tracking-[0.4px] text-button-primary">
          Anestesia Veterinária
        </Text>
      </View>

      <View className="w-full items-center px-7">
        <Text className="mb-5 text-base tracking-[0.2px] text-button-primary">
          Seja bem-vindo(a)
        </Text>

        <Pressable
          className="my-1.5 h-14 w-full items-center justify-center rounded-full bg-button-primary shadow-md active:opacity-[0.82]"
          onPress={onCreateAccount}
          accessibilityRole="button"
          accessibilityLabel="Criar conta"
        >
          <Text className="text-[17px] font-semibold tracking-[0.3px] text-white">
            Criar conta
          </Text>
        </Pressable>

        <OrDivider />

        <Pressable
          className="my-1.5 h-14 w-full items-center justify-center rounded-full bg-button-primary shadow-md active:opacity-[0.82]"
          onPress={onLogin}
          accessibilityRole="button"
          accessibilityLabel="Login"
        >  
          <Text className="text-[17px] font-semibold tracking-[0.3px] text-white">
            Login
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

