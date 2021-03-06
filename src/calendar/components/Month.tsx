import { ref, computed, PropType } from 'vue';

// Utils
import { addUnit, setScrollTop, createNamespace } from '../../utils';
import { getMonthEndDay } from '../../datetime-picker/utils';
import {
  t,
  bem,
  compareDay,
  getPrevDay,
  getNextDay,
  formatMonthTitle,
} from '../utils';

// Composition
import { useToggle } from '@vant/use';
import { useExpose } from '../../composables/use-expose';
import { useHeight } from '../../composables/use-height';

// Components
import Day, { DayItem, DayType } from './Day';

const [createComponent] = createNamespace('calendar-month');

export type CalendarType = 'single' | 'range' | 'multiple';

export default createComponent({
  props: {
    type: String as PropType<CalendarType>,
    color: String,
    showMark: Boolean,
    rowHeight: [Number, String],
    formatter: Function as PropType<(item: DayItem) => DayItem>,
    lazyRender: Boolean,
    currentDate: [Date, Array] as PropType<Date | Date[]>,
    allowSameDay: Boolean,
    showSubtitle: Boolean,
    showMonthTitle: Boolean,
    firstDayOfWeek: Number,
    date: {
      type: Date,
      required: true,
    },
    minDate: {
      type: Date,
      required: true,
    },
    maxDate: {
      type: Date,
      required: true,
    },
  },

  emits: ['click', 'update-height'],

  setup(props, { emit }) {
    const [visible, setVisible] = useToggle();
    const daysRef = ref<HTMLElement>();
    const monthRef = ref<HTMLElement>();
    const height = useHeight(monthRef);

    const title = computed(() => formatMonthTitle(props.date));
    const rowHeight = computed(() => addUnit(props.rowHeight));
    const offset = computed(() => {
      const realDay = props.date.getDay();

      if (props.firstDayOfWeek) {
        return (realDay + 7 - props.firstDayOfWeek) % 7;
      }
      return realDay;
    });

    const totalDay = computed(() =>
      getMonthEndDay(props.date.getFullYear(), props.date.getMonth() + 1)
    );

    const shouldRender = computed(() => visible.value || !props.lazyRender);

    const getTitle = () => title.value;

    const scrollIntoView = (body: Element) => {
      const el = props.showSubtitle ? daysRef.value : monthRef.value;

      const scrollTop =
        el!.getBoundingClientRect().top -
        body.getBoundingClientRect().top +
        body.scrollTop;

      setScrollTop(body, scrollTop);
    };

    const getMultipleDayType = (day: Date) => {
      const isSelected = (date: Date) =>
        (props.currentDate as Date[]).some(
          (item) => compareDay(item, date) === 0
        );

      if (isSelected(day)) {
        const prevDay = getPrevDay(day);
        const nextDay = getNextDay(day);
        const prevSelected = isSelected(prevDay);
        const nextSelected = isSelected(nextDay);

        if (prevSelected && nextSelected) {
          return 'multiple-middle';
        }
        if (prevSelected) {
          return 'end';
        }
        if (nextSelected) {
          return 'start';
        }
        return 'multiple-selected';
      }

      return '';
    };

    const getRangeDayType = (day: Date) => {
      const [startDay, endDay] = props.currentDate as Date[];

      if (!startDay) {
        return '';
      }

      const compareToStart = compareDay(day, startDay);

      if (!endDay) {
        return compareToStart === 0 ? 'start' : '';
      }

      const compareToEnd = compareDay(day, endDay);

      if (props.allowSameDay && compareToStart === 0 && compareToEnd === 0) {
        return 'start-end';
      }
      if (compareToStart === 0) {
        return 'start';
      }
      if (compareToEnd === 0) {
        return 'end';
      }
      if (compareToStart > 0 && compareToEnd < 0) {
        return 'middle';
      }

      return '';
    };

    const getDayType = (day: Date): DayType => {
      const { type, minDate, maxDate, currentDate } = props;

      if (compareDay(day, minDate) < 0 || compareDay(day, maxDate) > 0) {
        return 'disabled';
      }

      if (currentDate === null) {
        return '';
      }

      if (Array.isArray(currentDate)) {
        if (type === 'multiple') {
          return getMultipleDayType(day);
        }
        if (type === 'range') {
          return getRangeDayType(day);
        }
      } else if (type === 'single') {
        return compareDay(day, currentDate as Date) === 0 ? 'selected' : '';
      }

      return '';
    };

    const getBottomInfo = (dayType: DayType) => {
      if (props.type === 'range') {
        if (dayType === 'start' || dayType === 'end') {
          return t(dayType);
        }
        if (dayType === 'start-end') {
          return t('startEnd');
        }
      }
    };

    const renderTitle = () => {
      if (props.showMonthTitle) {
        return <div class={bem('month-title')}>{title.value}</div>;
      }
    };

    const renderMark = () => {
      if (props.showMark && shouldRender.value) {
        return <div class={bem('month-mark')}>{props.date.getMonth() + 1}</div>;
      }
    };

    const placeholders = computed(() => {
      const rows: DayItem[] = [];
      const count = Math.ceil((totalDay.value + offset.value) / 7);
      for (let day = 1; day <= count; day++) {
        rows.push({ type: 'placeholder' });
      }
      return rows;
    });

    const days = computed(() => {
      const days: DayItem[] = [];
      const year = props.date.getFullYear();
      const month = props.date.getMonth();

      for (let day = 1; day <= totalDay.value; day++) {
        const date = new Date(year, month, day);
        const type = getDayType(date);

        let config: DayItem = {
          date,
          type,
          text: day,
          bottomInfo: getBottomInfo(type),
        };

        if (props.formatter) {
          config = props.formatter(config);
        }

        days.push(config);
      }

      return days;
    });

    const renderDay = (item: DayItem, index: number) => (
      <Day
        item={item}
        index={index}
        color={props.color}
        offset={offset.value}
        rowHeight={rowHeight.value}
        onClick={(item) => {
          emit('click', item);
        }}
      />
    );

    const renderDays = () => {
      return (
        <div ref={daysRef} role="grid" class={bem('days')}>
          {renderMark()}
          {(shouldRender.value ? days : placeholders).value.map(renderDay)}
        </div>
      );
    };

    useExpose({
      getTitle,
      getHeight: () => height.value,
      setVisible,
      scrollIntoView,
    });

    return () => (
      <div class={bem('month')} ref={monthRef}>
        {renderTitle()}
        {renderDays()}
      </div>
    );
  },
});
