import React, { useState } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface DatePickerModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: (date: string) => void;
  initialDate?: string;
  title?: string;
}

const parseDate = (dateStr?: string) => {
  if (!dateStr || !dateStr.includes('/')) {
      const now = new Date();
      return { 
          day: now.getDate().toString().padStart(2, '0'), 
          month: (now.getMonth() + 1).toString().padStart(2, '0'), 
          year: now.getFullYear().toString() 
      };
  }
  const parts = dateStr.trim().split('/');
  return {
    day: parts[0].padStart(2, '0'),
    month: parts[1]?.padStart(2, '0') || '01',
    year: parts[2] || '2026'
  };
};

export const DatePickerModal = ({ visible, onClose, onConfirm, initialDate, title = "Select Date" }: DatePickerModalProps) => {

  const initial = parseDate(initialDate);
  const [day, setDay] = useState(initial.day);
  const [month, setMonth] = useState(initial.month);
  const [year, setYear] = useState(initial.year);

  // Sync state with initialDate prop when it changes or when modal becomes visible
  React.useEffect(() => {
    if (visible) {
      const parsed = parseDate(initialDate);
      setDay(parsed.day);
      setMonth(parsed.month);
      setYear(parsed.year);
    }
  }, [initialDate, visible]);

  const days = Array.from({ length: 31 }, (_, i) => (i + 1).toString().padStart(2, '0'));
  const months = Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, '0'));
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => (currentYear + i).toString());

  const handleConfirm = () => {
    onConfirm(`${day}/${month}/${year}`);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.content}>
          <Text style={styles.title}>{title}</Text>
          
          <View style={styles.pickerContainer}>
            {/* Day Column */}
            <View style={styles.column}>
              <Text style={styles.label}>Day</Text>
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                {days.map((d) => (
                  <TouchableOpacity 
                    key={d} 
                    style={[styles.option, day === d && styles.selectedOption]} 
                    onPress={() => setDay(d)}
                  >
                    <Text style={[styles.optionText, day === d && styles.selectedOptionText]}>{d}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <Text style={styles.separator}>/</Text>

            {/* Month Column */}
            <View style={styles.column}>
              <Text style={styles.label}>Month</Text>
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                {months.map((m) => (
                  <TouchableOpacity 
                    key={m} 
                    style={[styles.option, month === m && styles.selectedOption]} 
                    onPress={() => setMonth(m)}
                  >
                    <Text style={[styles.optionText, month === m && styles.selectedOptionText]}>{m}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <Text style={styles.separator}>/</Text>

            {/* Year Column */}
            <View style={styles.column}>
              <Text style={styles.label}>Year</Text>
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                {years.map((y) => (
                  <TouchableOpacity 
                    key={y} 
                    style={[styles.option, year === y && styles.selectedOption]} 
                    onPress={() => setYear(y)}
                  >
                    <Text style={[styles.optionText, year === y && styles.selectedOptionText]}>{y}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
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
    width: '90%',
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
    fontSize: 11,
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
    fontSize: 16,
    fontWeight: '600',
    color: '#0D1B2A',
  },
  selectedOptionText: {
    color: '#FFF',
  },
  separator: {
    fontSize: 20,
    fontWeight: '700',
    color: '#CCC',
    marginHorizontal: 4,
    marginTop: 20,
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
