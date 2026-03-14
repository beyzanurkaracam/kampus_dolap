if(NOT TARGET hermes-engine::hermesvm)
add_library(hermes-engine::hermesvm SHARED IMPORTED)
set_target_properties(hermes-engine::hermesvm PROPERTIES
    IMPORTED_LOCATION "C:/Users/Beyza/.gradle/caches/8.13/transforms/1756ed584d02e352dfa0aae456716c3c/transformed/hermes-android-0.82.0-debug/prefab/modules/hermesvm/libs/android.x86_64/libhermesvm.so"
    INTERFACE_INCLUDE_DIRECTORIES "C:/Users/Beyza/.gradle/caches/8.13/transforms/1756ed584d02e352dfa0aae456716c3c/transformed/hermes-android-0.82.0-debug/prefab/modules/hermesvm/include"
    INTERFACE_LINK_LIBRARIES ""
)
endif()

