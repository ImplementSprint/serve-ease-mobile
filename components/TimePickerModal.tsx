import React, { useState } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface TimePickerModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (time: string) => void;
  initialTime?: string;
  title?: string;
}

const parseTime = (timeStr?: string) => {
  if (!timeStr) return { hour: '08', minute: '00', ampm: 'AM' };
  try {
    const parts = timeStr.trim().split(' ');
    const hmp = parts[0].split(':');
    return {
      hour: hmp[0].padStart(2, '0'),
      minute: hmp[1]?.padStart(2, '0') || '00',
      ampm: parts[1] || 'AM'
    };
  } catch (e) {
    return { hour: '08', minute: '00', ampm: 'AM' };
  }
};

export const TimePickerModal = ({ visible, onClose, onConfirm, initialTime, title = "Select Time" }: TimePickerModalProps) => {

  const initial = parseTime(initialTime);
  const [hour, setHour] = useState(initial.hour);
  const [minute, setMinute] = useState(initial.minute);
  const [ampm, setAmpm] = useState(initial.ampm);

  // Sync state with initialTime prop when it changes or when modal becomes visible
  React.useEffect(() => {
    if (visible) {
      const parsed = parseTime(initialTime);
      setHour(parsed.hour);
      setMinute(parsed.minute);
      setAmpm(parsed.ampm);
    }
  }, [initialTime, visible]);

  const hours = Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, '0'));
  const minutes = ['00', '15', '30', '45'];

  const handleConfirm = () => {
    onConfirm(`${hour}:${minute} ${ampm}`);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.content}>
          <Text style={styles.title}>{title}</Text>
          
          <View style={styles.pickerContainer}>
            {/* Hour Column */}
            <View style={styles.column}>
              <Text style={styles.label}>Hour</Text>
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                {hours.map((h) => (
                  <TouchableOpacity 
                    key={h} 
                    style={[styles.option, hour === h && styles.selectedOption]} 
                    onPress={() => setHour(h)}
                  >
                    <Text style={[styles.optionText, hour === h && styles.selectedOptionText]}>{h}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <Text style={styles.separator}>:</Text>

            {/* Minute Column */}
            <View style={styles.column}>
              <Text style={styles.label}>Min</Text>
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                {minutes.map((m) => (
                  <TouchableOpacity 
                    key={m} 
                    style={[styles.option, minute === m && styles.selectedOption]} 
                    onPress={() => setMinute(m)}
                  >
                    <Text style={[styles.optionText, minute === m && styles.selectedOptionText]}>{m}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* AM/PM Toggle */}
            <View style={styles.ampmContainer}>
              <TouchableOpacity 
                style={[styles.ampmOption, ampm === 'AM' && styles.selectedAmpm]} 
                onPress={() => setAmpm('AM')}
              >
                <Text style={[styles.ampmText, ampm === 'AM' && styles.selectedOptionText]}>AM</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.ampmOption, ampm === 'PM' && styles.selectedAmpm]} 
                onPress={() => setAmpm('PM')}
              >
                <Text style={[styles.ampmText, ampm === 'PM' && styles.selectedOptionText]}>PM</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.footer}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.confirmButton} onPress={handleConfirm}>
              <Text style={styles.confirmButtonText}>Confirm</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    width: '85%',
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0D1B2A',
    marginBottom: 24,
    textAlign: 'center',
  },
  pickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 180,
    marginBottom: 24,
  },
  column: {
    flex: 1,
    alignItems: 'center',
  },
  label: {
    fontSize: 12,
    color: '#8E8E93',
    fontWeight: '600',
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  scrollContent: {
    alignItems: 'center',
  },
  option: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 4,
  },
  selectedOption: {
    backgroundColor: '#00B761',
  },
  optionText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0D1B2A',
  },
  selectedOptionText: {
    color: '#FFF',
  },
  separator: {
    fontSize: 24,
    fontWeight: '700',
    color: '#CCC',
    marginHorizontal: 8,
    marginTop: 20,
  },
  ampmContainer: {
    marginLeft: 16,
    gap: 8,
  },
  ampmOption: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#F0F0F0',
    alignItems: 'center',
    minWidth: 50,
  },
  selectedAmpm: {
    backgroundColor: '#00B761',
    borderColor: '#00B761',
  },
  ampmText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#555',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: '#F8F9FA',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8E8E93',
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: '#00B761',
    alignItems: 'center',
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
  },
});
