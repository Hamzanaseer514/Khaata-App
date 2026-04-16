import React from 'react';
import type { WidgetTaskHandlerProps } from 'react-native-android-widget';
import { KhaataWidget } from './KhaataWidget';
import AsyncStorage from '@react-native-async-storage/async-storage';

const WIDGET_NAME = 'KhaataBalance';

async function getWidgetData() {
  try {
    // Read cached widget data from AsyncStorage
    const cached = await AsyncStorage.getItem('widget_data');
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (e) {
    console.error('Widget data read error:', e);
  }
  return { receivable: '0', payable: '0', net: '0', contacts: '0' };
}

export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  const widgetInfo = props.widgetInfo;
  const widgetName = widgetInfo.widgetName;

  switch (props.widgetAction) {
    case 'WIDGET_ADDED':
    case 'WIDGET_UPDATE':
    case 'WIDGET_RESIZED': {
      const data = await getWidgetData();
      props.renderWidget(
        <KhaataWidget
          receivable={data.receivable}
          payable={data.payable}
          net={data.net}
          contacts={data.contacts}
        />
      );
      break;
    }

    case 'WIDGET_CLICK': {
      // clickAction="OPEN_APP" handles this automatically
      break;
    }

    case 'WIDGET_DELETED': {
      // Cleanup if needed
      break;
    }

    default:
      break;
  }
}
