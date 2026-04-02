import { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useUIStore, useTTSStore } from '../../../stores';
import { useTTS } from '../hooks';

const SPEED_OPTIONS = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];
const PITCH_OPTIONS = [0.5, 0.75, 1.0, 1.25, 1.5];
const SLEEP_OPTIONS = [0, 5, 10, 15, 30, 60]; // minutes, 0 = off

export function TTSMiniPlayer() {
  const colors = useUIStore((s) => s.colors);
  const { status, play, pause, stop, skipForward, skipBackward } = useTTS();
  const contentId = useTTSStore((s) => s.contentId);
  const speed = useTTSStore((s) => s.speed);
  const pitch = useTTSStore((s) => s.pitch);
  const setSpeed = useTTSStore((s) => s.setSpeed);
  const setPitch = useTTSStore((s) => s.setPitch);
  const currentChunkIndex = useTTSStore((s) => s.currentChunkIndex);
  const totalChunks = useTTSStore((s) => s.chunks.length);

  const [expanded, setExpanded] = useState(false);
  const [sleepMinutes, setSleepMinutes] = useState(0);
  const sleepTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sleep timer effect
  useEffect(() => {
    if (sleepTimerRef.current) {
      clearTimeout(sleepTimerRef.current);
      sleepTimerRef.current = null;
    }
    if (sleepMinutes > 0 && status === 'playing') {
      sleepTimerRef.current = setTimeout(() => {
        stop();
        setSleepMinutes(0);
      }, sleepMinutes * 60 * 1000);
    }
    return () => {
      if (sleepTimerRef.current) clearTimeout(sleepTimerRef.current);
    };
  }, [sleepMinutes, status, stop]);

  if (status === 'idle' && !contentId) return null;

  const isPlaying = status === 'playing';
  const progress = totalChunks > 0 ? `${currentChunkIndex + 1}/${totalChunks}` : '';

  const handlePlayPause = () => {
    if (isPlaying) {
      pause();
    } else if (contentId) {
      play(contentId);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
      {/* Main controls row */}
      <View style={styles.mainRow}>
        <TouchableOpacity onPress={skipBackward} style={styles.btn}>
          <Ionicons name="play-skip-back" size={20} color={colors.text} />
        </TouchableOpacity>

        <TouchableOpacity onPress={handlePlayPause} style={[styles.playBtn, { backgroundColor: colors.primary }]}>
          <Ionicons name={isPlaying ? 'pause' : 'play'} size={24} color="#FFF" />
        </TouchableOpacity>

        <TouchableOpacity onPress={skipForward} style={styles.btn}>
          <Ionicons name="play-skip-forward" size={20} color={colors.text} />
        </TouchableOpacity>

        <Text style={[styles.progress, { color: colors.textSecondary }]}>{progress}</Text>

        <TouchableOpacity onPress={() => setExpanded(!expanded)} style={styles.btn}>
          <Ionicons name={expanded ? 'chevron-down' : 'options-outline'} size={20} color={colors.text} />
        </TouchableOpacity>

        <TouchableOpacity onPress={stop} style={styles.btn}>
          <Ionicons name="close" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Expanded panel */}
      {expanded && (
        <View style={[styles.panel, { borderTopColor: colors.border }]}>
          {/* Speed */}
          <Text style={[styles.panelLabel, { color: colors.textSecondary }]}>Speed</Text>
          <View style={styles.chipRow}>
            {SPEED_OPTIONS.map((s) => {
              const active = Math.abs(speed - s) < 0.01;
              return (
                <TouchableOpacity
                  key={s}
                  style={[styles.chip, { backgroundColor: active ? colors.primary : colors.background, borderColor: colors.border }]}
                  onPress={() => setSpeed(s)}
                >
                  <Text style={{ color: active ? '#FFF' : colors.text, fontSize: 12 }}>{s}x</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Pitch */}
          <Text style={[styles.panelLabel, { color: colors.textSecondary }]}>Pitch</Text>
          <View style={styles.chipRow}>
            {PITCH_OPTIONS.map((p) => {
              const active = Math.abs(pitch - p) < 0.01;
              return (
                <TouchableOpacity
                  key={p}
                  style={[styles.chip, { backgroundColor: active ? colors.primary : colors.background, borderColor: colors.border }]}
                  onPress={() => setPitch(p)}
                >
                  <Text style={{ color: active ? '#FFF' : colors.text, fontSize: 12 }}>{p}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Sleep timer */}
          <Text style={[styles.panelLabel, { color: colors.textSecondary }]}>Sleep Timer</Text>
          <View style={styles.chipRow}>
            {SLEEP_OPTIONS.map((m) => {
              const active = sleepMinutes === m;
              const label = m === 0 ? 'Off' : `${m}m`;
              return (
                <TouchableOpacity
                  key={m}
                  style={[styles.chip, { backgroundColor: active ? colors.primary : colors.background, borderColor: colors.border }]}
                  onPress={() => setSleepMinutes(m)}
                >
                  <Text style={{ color: active ? '#FFF' : colors.text, fontSize: 12 }}>{label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: 1,
    paddingBottom: 24,
  },
  mainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  btn: { padding: 8 },
  playBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progress: { flex: 1, fontSize: 12, textAlign: 'center' },
  panel: {
    borderTopWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  panelLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 8,
    marginBottom: 4,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
});