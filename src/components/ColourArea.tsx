import { useRef, type ReactNode } from 'react';
import { StyleSheet, View, type AccessibilityActionEvent, type GestureResponderEvent, type ViewStyle } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { radius, type ThemeColors } from '@/constants/theme';
import { useThemedStyles } from '@/hooks/useTheme';
import { hsvToHex, type Hsv } from '@/utils/colour';

const AREA_HEIGHT = 136;
const SLIDER_HEIGHT = 28;
const THUMB = 26;
const HUE_STEP = 15;
const HUES = [0, 60, 120, 180, 240, 300, 360];

const clamp = (value: number) => Math.min(1, Math.max(0, value));

type DragBoxProps = {
  style: ViewStyle;
  onDrag: (x: number, y: number) => void;
  children: ReactNode;
};

/** Reports a finger's position as 0-1 across and down. Children ignore touches, so this box is always the target. */
function DragBox({ style, onDrag, children }: DragBoxProps) {
  const size = useRef({ width: 1, height: 1 });
  const origin = useRef({ x: 0, y: 0 });

  // Page positions, because Android can report locationX against whatever is under the finger.
  function report(event: GestureResponderEvent) {
    const { pageX, pageY } = event.nativeEvent;
    onDrag(
      clamp((pageX - origin.current.x) / size.current.width),
      clamp((pageY - origin.current.y) / size.current.height),
    );
  }

  return (
    <View
      style={style}
      onLayout={(event) => {
        const { width, height } = event.nativeEvent.layout;
        size.current = { width: Math.max(width, 1), height: Math.max(height, 1) };
      }}
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => true}
      onResponderTerminationRequest={() => false}
      onResponderGrant={(event) => {
        const { pageX, pageY, locationX, locationY } = event.nativeEvent;
        origin.current = { x: pageX - locationX, y: pageY - locationY };
        report(event);
      }}
      onResponderMove={report}
    >
      {children}
    </View>
  );
}

type ColourAreaProps = {
  hsv: Hsv;
  onChange: (hsv: Hsv) => void;
};

/** Saturation across and brightness down for the current hue, with a hue slider below. */
export function ColourArea({ hsv, onChange }: ColourAreaProps) {
  const styles = useThemedStyles(createStyles);
  const pureHue = hsvToHex({ h: hsv.h, s: 1, v: 1 });

  function stepHue(event: AccessibilityActionEvent) {
    const by = event.nativeEvent.actionName === 'increment' ? HUE_STEP : -HUE_STEP;
    onChange({ ...hsv, h: (hsv.h + by + 360) % 360 });
  }

  return (
    <View style={styles.wrap}>
      <DragBox style={styles.area} onDrag={(x, y) => onChange({ ...hsv, s: x, v: 1 - y })}>
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <Svg width="100%" height="100%">
            {/* White to black is the HSV model itself, not theme colour. */}
            <Defs>
              <LinearGradient id="saturation" x1="0" y1="0" x2="1" y2="0">
                <Stop offset="0" stopColor="#FFFFFF" />
                <Stop offset="1" stopColor={pureHue} />
              </LinearGradient>
              <LinearGradient id="brightness" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor="#000000" stopOpacity={0} />
                <Stop offset="1" stopColor="#000000" stopOpacity={1} />
              </LinearGradient>
            </Defs>
            <Rect width="100%" height="100%" rx={radius.md} fill="url(#saturation)" />
            <Rect width="100%" height="100%" rx={radius.md} fill="url(#brightness)" />
          </Svg>
        </View>
        <View
          pointerEvents="none"
          style={[styles.thumb, { left: `${hsv.s * 100}%`, top: `${(1 - hsv.v) * 100}%`, backgroundColor: hsvToHex(hsv) }]}
        />
      </DragBox>

      <View
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel="Hue"
        accessibilityValue={{ min: 0, max: 360, now: Math.round(hsv.h) }}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={stepHue}
      >
        <DragBox style={styles.slider} onDrag={(x) => onChange({ ...hsv, h: x * 360 })}>
          <View style={StyleSheet.absoluteFill} pointerEvents="none">
            <Svg width="100%" height="100%">
              <Defs>
                <LinearGradient id="hue" x1="0" y1="0" x2="1" y2="0">
                  {HUES.map((h) => (
                    <Stop key={h} offset={h / 360} stopColor={hsvToHex({ h, s: 1, v: 1 })} />
                  ))}
                </LinearGradient>
              </Defs>
              <Rect width="100%" height="100%" rx={SLIDER_HEIGHT / 2} fill="url(#hue)" />
            </Svg>
          </View>
          <View
            pointerEvents="none"
            style={[styles.thumb, styles.sliderThumb, { left: `${(hsv.h / 360) * 100}%`, backgroundColor: pureHue }]}
          />
        </DragBox>
      </View>
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    wrap: {
      gap: 14,
    },
    area: {
      height: AREA_HEIGHT,
    },
    slider: {
      height: SLIDER_HEIGHT,
      // Room for the thumb at both ends.
      marginHorizontal: THUMB / 2,
    },
    thumb: {
      position: 'absolute',
      width: THUMB,
      height: THUMB,
      marginLeft: -THUMB / 2,
      marginTop: -THUMB / 2,
      borderRadius: radius.pill,
      borderWidth: 3,
      borderColor: colors.pickerThumb,
      // The dark edge keeps the white ring visible on light colours.
      outlineColor: colors.pickerThumbEdge,
      outlineWidth: 1,
    },
    sliderThumb: {
      top: '50%',
    },
  });
