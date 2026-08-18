# React Native ProGuard rules (prevents release crashes)
-keep class com.facebook.hermes.unicode.** { *; }
-keep class com.facebook.jni.** { *; }

# React Native
-keep class com.facebook.react.** { *; }
-keep class com.facebook.react.bridge.** { *; }
-keep class com.facebook.react.modules.** { *; }

# Reanimated (required)
-keep class com.swmansion.reanimated.** { *; }
-keep class com.facebook.react.turbomodule.** { *; }

# react-native-svg
-keep class com.horcrux.svg.** { *; }

# react-native-video
-keep class com.brentvatne.react.** { *; }

# react-native-gesture-handler
-keep class com.swmansion.gesturehandler.** { *; }

# react-native-screens
-keep class com.swmansion.rnscreens.** { *; }

# Firebase / Google Sign-In
-keep class com.google.firebase.** { *; }
-keep class com.google.android.gms.** { *; }

# react-native-google-signin
-keep class com.reactnativegooglesignin.** { *; }

# react-native-razorpay
-keep class com.razorpay.** { *; }

# Keep native modules from react-native
-keep,allowobfuscation @interface com.facebook.proguard.annotations.DoNotStrip
-keep @com.facebook.proguard.annotations.DoNotStrip class *
-keepclassmembers class * {
    @com.facebook.proguard.annotations.DoNotStrip *;
}
