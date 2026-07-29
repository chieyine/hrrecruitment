import AdminCrud from '@/components/admin/AdminCrud'
import ConfigurationBuilder from '@/components/admin/ConfigurationBuilder'

export default function AdminScorecardsPage() {
  return (
    <>
      <AdminCrud
        entity="scorecards"
        title="Scorecards"
        subtitle="Set the evidence and points reviewers must record at screening or interview."
        columns={[
          { name: 'name', label: 'Scorecard' },
          { name: 'scorecardType', label: 'Used at' },
          { name: 'criteria.length', label: 'Criteria' },
          { name: '_count.scorecards', label: 'Completed or draft' },
          { name: 'version', label: 'Version' },
          { name: 'active', label: 'Active' },
        ]}
        fields={[
          {
            name: 'name',
            label: 'Scorecard name',
            required: true,
            placeholder: 'For example, Standard vacancy screening',
            helpText: 'Use a name reviewers will recognise when it is assigned to a vacancy.',
          },
          {
            name: 'scorecardType',
            label: 'Selection stage',
            type: 'select',
            required: true,
            options: [
              { value: 'SCREENING', label: 'Application screening' },
              { value: 'INTERVIEW', label: 'Interview' },
            ],
          },
          {
            name: 'description',
            label: 'When to use this scorecard',
            type: 'textarea',
            required: true,
            placeholder: 'Describe the vacancies or selection stage this scorecard is intended for.',
          },
          {
            name: 'active',
            label: 'Available for new vacancies',
            type: 'checkbox',
            defaultValue: false,
            helpText: 'Build the criteria first. Activation is submitted as a controlled change.',
          },
        ]}
      />
      <ConfigurationBuilder mode="scorecards" />
    </>
  )
}
