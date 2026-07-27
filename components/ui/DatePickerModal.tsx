import React, {useState, useEffect} from 'react';
import {View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView} from 'react-native';
import {Colors, Typography, Spacing, Radius} from '../../src/theme';

interface DatePickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectDate: (dateString: string) => void;
  currentValue?: string; // Format: YYYY-MM-DD
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const DAYS_OF_WEEK = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export function DatePickerModal({visible, onClose, onSelectDate, currentValue}: DatePickerModalProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDateStr, setSelectedDateStr] = useState('');

  useEffect(() => {
    if (currentValue) {
      const parsed = new Date(currentValue);
      if (!isNaN(parsed.getTime())) {
        setCurrentDate(parsed);
        setSelectedDateStr(currentValue);
      }
    }
  }, [currentValue, visible]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = new Date(year, month, 1).getDay();

  // Create grid cells
  const cells: {day: number | null, isCurrentMonth: boolean, dateString: string}[] = [];

  // Previous month padding
  const prevMonthDays = new Date(year, month, 0).getDate();
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    const d = prevMonthDays - i;
    const prevMonthDate = new Date(year, month - 1, d);
    const dateStr = formatDate(prevMonthDate);
    cells.push({day: d, isCurrentMonth: false, dateString: dateStr});
  }

  // Current month days
  for (let d = 1; d <= daysInMonth; d++) {
    const curDate = new Date(year, month, d);
    const dateStr = formatDate(curDate);
    cells.push({day: d, isCurrentMonth: true, dateString: dateStr});
  }

  // Next month padding to align the grid to 42 cells (6 rows)
  const remaining = 42 - cells.length;
  for (let d = 1; d <= remaining; d++) {
    const nextMonthDate = new Date(year, month + 1, d);
    const dateStr = formatDate(nextMonthDate);
    cells.push({day: d, isCurrentMonth: false, dateString: dateStr});
  }

  function formatDate(d: Date): string {
    const yearStr = d.getFullYear();
    const monthStr = String(d.getMonth() + 1).padStart(2, '0');
    const dayStr = String(d.getDate()).padStart(2, '0');
    return `${yearStr}-${monthStr}-${dayStr}`;
  }

  const handleSelectDay = (dateString: string) => {
    setSelectedDateStr(dateString);
  };

  const handleConfirm = () => {
    if (selectedDateStr) {
      onSelectDate(selectedDateStr);
    } else {
      const todayStr = formatDate(new Date());
      onSelectDate(todayStr);
    }
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.container, {backgroundColor: Colors.card, borderColor: Colors.border}]}>
          
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={handlePrevMonth} style={styles.navBtn}>
              <Text style={[styles.navBtnText, {color: Colors.primary}]}>◀</Text>
            </TouchableOpacity>
            
            <Text style={[styles.headerTitle, {color: Colors.textPrimary}]}>
              {MONTHS[month]} {year}
            </Text>
            
            <TouchableOpacity onPress={handleNextMonth} style={styles.navBtn}>
              <Text style={[styles.navBtnText, {color: Colors.primary}]}>▶</Text>
            </TouchableOpacity>
          </View>

          {/* Weekday Names */}
          <View style={styles.weekdaysRow}>
            {DAYS_OF_WEEK.map((day, idx) => (
              <Text key={idx} style={[styles.weekdayText, {color: Colors.textTertiary}]}>
                {day}
              </Text>
            ))}
          </View>

          {/* Calendar Grid */}
          <View style={styles.grid}>
            {cells.map((cell, idx) => {
              const isSelected = cell.dateString === selectedDateStr;
              return (
                <TouchableOpacity
                  key={idx}
                  style={[
                    styles.cell,
                    isSelected && {backgroundColor: Colors.primary, borderRadius: Radius.md}
                  ]}
                  onPress={() => handleSelectDay(cell.dateString)}
                >
                  <Text
                    style={[
                      styles.cellText,
                      {
                        color: isSelected
                          ? '#FFF'
                          : cell.isCurrentMonth
                          ? Colors.textPrimary
                          : Colors.textTertiary
                      },
                      isSelected && {fontWeight: 'bold'}
                    ]}
                  >
                    {cell.day}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity onPress={onClose} style={[styles.actionBtn, styles.cancelBtn]}>
              <Text style={[styles.actionBtnText, {color: Colors.textSecondary}]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleConfirm} style={[styles.actionBtn, {backgroundColor: Colors.primary}]}>
              <Text style={[styles.actionBtnText, {color: '#FFF'}]}>Confirm</Text>
            </TouchableOpacity>
          </View>

        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  container: {
    width: '100%',
    maxWidth: 340,
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: Spacing.lg,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  headerTitle: {
    ...Typography.bodyBold,
    fontSize: 16,
  },
  navBtn: {
    padding: Spacing.xs,
    minWidth: 32,
    alignItems: 'center',
  },
  navBtnText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  weekdaysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
  },
  weekdayText: {
    width: '14%',
    textAlign: 'center',
    fontSize: 12,
    fontWeight: 'bold',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  cell: {
    width: '14%',
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 2,
  },
  cellText: {
    fontSize: 13,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.sm,
    marginTop: Spacing.xs,
  },
  actionBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    borderRadius: Radius.md,
    minWidth: 80,
    alignItems: 'center',
  },
  cancelBtn: {
    borderWidth: 1,
    borderColor: Colors.border,
  },
  actionBtnText: {
    ...Typography.button,
    fontSize: 13,
  },
});
