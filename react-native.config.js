module.exports = {
    project: {
      ios: {
        automaticPodsInstallation: true
      },
      android: {},
    },
    // Eğer react-native-date-picker sorun çıkarıyorsa autolinking'i iptal edebiliriz:
    // dependencies: {
    //   'react-native-date-picker': {
    //     platforms: {
    //       ios: null,
    //     },
    //   },
    // },
  };