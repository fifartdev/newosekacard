import type { CollectionConfig } from 'payload'
import { v4 as uuidv4 } from 'uuid'

import { afterCreateProfile } from '@/hooks/afterCreateProfile'

/**
 * Profiles collection — one record per registered client.
 *
 * Scalability pattern: the `role` select drives `admin.condition` on each
 * role-specific group. Adding a new role means:
 *   1. Add the value to the `role` options array.
 *   2. Add a new group field with `admin.condition` matching the new role.
 * No schema migration is required for other roles.
 */
export const Profiles: CollectionConfig = {
  slug: 'profiles',
  auth: false,
  admin: {
    useAsTitle: 'fullName',
    defaultColumns: ['fullName', 'role', 'email', 'createdAt'],
    description: 'Client profiles — each profile auto-generates a wallet pass on creation.',
  },
  hooks: {
    afterChange: [afterCreateProfile],
  },
  access: {
    // Public read so /profile/[id] works without auth
    read: () => true,
    create: () => true,
    update: ({ req }) => Boolean(req.user),
    delete: ({ req }) => Boolean(req.user),
  },
  fields: [
    // ── Wallet metadata (server-written, read-only in admin UI) ──────────
    {
      name: 'uniqueQrToken',
      type: 'text',
      unique: true,
      admin: { readOnly: true, position: 'sidebar', description: 'Auto-generated UUID for QR tracking.' },
      defaultValue: () => uuidv4(),
    },
    {
      name: 'walletPassUrl',
      type: 'text',
      admin: {
        readOnly: true,
        position: 'sidebar',
        description: 'Apple Wallet .pkpass download path (set automatically).',
      },
    },
    {
      name: 'googleWalletUrl',
      type: 'text',
      admin: {
        readOnly: true,
        position: 'sidebar',
        description: 'Google Wallet save URL (set automatically).',
      },
    },

    // ── Core identity (shared by all roles) ──────────────────────────────
    {
      name: 'fullName',
      type: 'text',
      required: true,
      label: 'Full Name',
    },
    {
      name: 'email',
      type: 'email',
      required: true,
      unique: true,
    },
    {
      name: 'phone',
      type: 'text',
      label: 'Phone Number',
    },
    {
      name: 'avatar',
      type: 'upload',
      relationTo: 'media',
      label: 'Profile Photo',
    },

    // ── Pass expiration ───────────────────────────────────────────────────
    {
      name: 'passExpiresAt',
      type: 'date',
      label: 'Pass Expiration Date',
      admin: {
        position: 'sidebar',
        description: 'Optional. Leave blank for no expiration.',
        date: { pickerAppearance: 'dayOnly' },
      },
    },

    // ── Role selector ─────────────────────────────────────────────────────
    {
      name: 'role',
      type: 'select',
      required: true,
      defaultValue: 'client_type_a',
      label: 'Account Role',
      options: [
        { label: 'Admin', value: 'admin' },
        { label: 'Client — Individual', value: 'client_type_a' },
        { label: 'Client — Business', value: 'client_type_b' },
      ],
      admin: {
        description: 'Determines which profile data fields are shown and validated.',
      },
    },

    // ── Role: Individual (client_type_a) ──────────────────────────────────
    {
      name: 'individualProfile',
      type: 'group',
      label: 'Individual Profile',
      admin: {
        condition: (data) => data?.role === 'client_type_a',
        description: 'Fields visible only for Individual clients.',
      },
      fields: [
        {
          name: 'jobTitle',
          type: 'text',
          label: 'Job Title',
        },
        {
          name: 'bio',
          type: 'textarea',
          label: 'Short Bio',
          admin: { description: 'Displayed on the public profile page.' },
        },
        {
          name: 'linkedinUrl',
          type: 'text',
          label: 'LinkedIn URL',
        },
        {
          name: 'portfolioUrl',
          type: 'text',
          label: 'Portfolio / Website URL',
        },
        {
          name: 'skills',
          type: 'array',
          label: 'Skills',
          fields: [{ name: 'skill', type: 'text', required: true }],
        },
      ],
    },

    // ── Role: Business (client_type_b) ────────────────────────────────────
    {
      name: 'businessProfile',
      type: 'group',
      label: 'Business Profile',
      admin: {
        condition: (data) => data?.role === 'client_type_b',
        description: 'Fields visible only for Business clients.',
      },
      fields: [
        {
          name: 'companyName',
          type: 'text',
          label: 'Company Name',
          required: true,
        },
        {
          name: 'industry',
          type: 'text',
          label: 'Industry',
        },
        {
          name: 'websiteUrl',
          type: 'text',
          label: 'Website URL',
        },
        {
          name: 'taxId',
          type: 'text',
          label: 'Tax ID / VAT Number',
        },
        {
          name: 'employeeCount',
          type: 'select',
          label: 'Company Size',
          options: [
            { label: '1–10', value: '1-10' },
            { label: '11–50', value: '11-50' },
            { label: '51–200', value: '51-200' },
            { label: '200+', value: '200+' },
          ],
        },
        {
          name: 'address',
          type: 'group',
          label: 'Business Address',
          fields: [
            { name: 'street', type: 'text', label: 'Street' },
            { name: 'city', type: 'text', label: 'City' },
            { name: 'postalCode', type: 'text', label: 'Postal Code' },
            { name: 'country', type: 'text', label: 'Country' },
          ],
        },
      ],
    },
  ],
}
