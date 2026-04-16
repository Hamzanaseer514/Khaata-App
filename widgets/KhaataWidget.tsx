import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';

interface KhaataWidgetProps {
  receivable: string;
  payable: string;
  net: string;
  contacts: string;
}

export function KhaataWidget({ receivable, payable, net, contacts }: KhaataWidgetProps) {
  const netNum = parseFloat(net);
  const netColor = netNum > 0 ? '#22c55e' : netNum < 0 ? '#ef4444' : '#94a3b8';

  return (
    <FlexWidget
      style={{
        height: 'match_parent',
        width: 'match_parent',
        backgroundColor: '#0a0a0c',
        borderRadius: 24,
        padding: 20,
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}
      clickAction="OPEN_APP"
    >
      {/* Header */}
      <FlexWidget
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: 'match_parent',
        }}
      >
        <TextWidget
          text="KhaataWise"
          style={{
            fontSize: 14,
            fontWeight: '700',
            color: '#25d1f4',
          }}
        />
        <TextWidget
          text={`${contacts} contacts`}
          style={{
            fontSize: 11,
            color: '#64748b',
          }}
        />
      </FlexWidget>

      {/* Net Balance */}
      <FlexWidget
        style={{
          alignItems: 'center',
          justifyContent: 'center',
          width: 'match_parent',
          paddingVertical: 8,
        }}
      >
        <TextWidget
          text="NET BALANCE"
          style={{
            fontSize: 10,
            fontWeight: '600',
            color: '#64748b',
            letterSpacing: 1,
          }}
        />
        <TextWidget
          text={`Rs ${net}`}
          style={{
            fontSize: 28,
            fontWeight: '900',
            color: netColor,
          }}
        />
      </FlexWidget>

      {/* Footer: Receivable & Payable */}
      <FlexWidget
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          width: 'match_parent',
          borderTopWidth: 1,
          borderTopColor: '#1e293b',
          paddingTop: 12,
        }}
      >
        <FlexWidget style={{ flexDirection: 'column' }}>
          <TextWidget
            text="RECEIVABLE"
            style={{ fontSize: 9, fontWeight: '700', color: '#64748b', letterSpacing: 0.5 }}
          />
          <TextWidget
            text={`Rs ${receivable}`}
            style={{ fontSize: 16, fontWeight: '800', color: '#22c55e' }}
          />
        </FlexWidget>

        <FlexWidget style={{ flexDirection: 'column', alignItems: 'flex-end' }}>
          <TextWidget
            text="PAYABLE"
            style={{ fontSize: 9, fontWeight: '700', color: '#64748b', letterSpacing: 0.5 }}
          />
          <TextWidget
            text={`Rs ${payable}`}
            style={{ fontSize: 16, fontWeight: '800', color: '#ef4444' }}
          />
        </FlexWidget>
      </FlexWidget>
    </FlexWidget>
  );
}
