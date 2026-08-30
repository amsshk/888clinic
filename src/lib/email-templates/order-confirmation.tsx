import React from 'react'
import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components'
import type { TemplateEntry } from './registry'

interface Props {
  name?: string
  items?: string
  total?: string
  fulfilment?: string
  address?: string
  recurring?: string
}

const Email = ({ name, items, total, fulfilment, address, recurring }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your 888clinic skincare order is confirmed</Preview>
    <Body style={main}>
      <Container style={container}>
        <Text style={brand}>888clinic</Text>
        <Heading style={heading}>Thank you for your order</Heading>
        <Text style={text}>{name ? `Dear ${name},` : 'Hello,'}</Text>
        <Text style={text}>
          Your payment went through and our team is preparing your skincare now.
        </Text>
        <Section style={card}>
          <Text style={label}>Items</Text>
          <Text style={value}>{items || 'Skincare order'}</Text>
          <Text style={label}>Total paid</Text>
          <Text style={value}>{total || '—'}</Text>
          <Text style={label}>How you receive it</Text>
          <Text style={value}>{fulfilment || 'Delivery in Thailand'}</Text>
          {address ? (
            <>
              <Text style={label}>Delivery address</Text>
              <Text style={value}>{address}</Text>
            </>
          ) : null}
          {recurring ? (
            <>
              <Text style={label}>Refill plan</Text>
              <Text style={value}>{recurring}</Text>
            </>
          ) : null}
        </Section>
        <Text style={muted}>
          Deliveries are dispatched within 1–2 working days. Clinic pickups are ready the
          next working day — just ask for your name at reception.
        </Text>
        <Hr style={hr} />
        <Text style={footer}>888clinic Dermatology · Bangkok, Thailand</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: 'Your 888clinic skincare order is confirmed',
  displayName: 'Order confirmation (patient)',
  previewData: {
    name: 'Jane Doe',
    items: 'Vitamin C 15 Serum × 1',
    total: '฿2,590',
    fulfilment: 'Delivery in Thailand',
    address: '888 Wellness Avenue, Bangkok 10110',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Helvetica, Arial, sans-serif' }
const container = { padding: '32px 28px', maxWidth: '560px' }
const brand = {
  fontSize: '13px',
  letterSpacing: '3px',
  textTransform: 'uppercase' as const,
  color: '#9a7b3f',
  margin: '0 0 18px',
}
const heading = { fontSize: '26px', color: '#2b2b2b', margin: '0 0 20px', fontWeight: 400 }
const text = { fontSize: '15px', lineHeight: '24px', color: '#3d3d3d', margin: '0 0 14px' }
const card = {
  border: '1px solid #e6e2da',
  backgroundColor: '#faf8f4',
  padding: '18px 20px',
  margin: '20px 0',
}
const label = {
  fontSize: '11px',
  letterSpacing: '1.5px',
  textTransform: 'uppercase' as const,
  color: '#8b8b8b',
  margin: '0 0 4px',
}
const value = { fontSize: '15px', color: '#2b2b2b', margin: '0 0 14px' }
const muted = { fontSize: '13px', lineHeight: '20px', color: '#6b6b6b', margin: '0' }
const hr = { borderColor: '#e6e2da', margin: '26px 0 14px' }
const footer = { fontSize: '12px', color: '#8b8b8b', margin: '0' }
