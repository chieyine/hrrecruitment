import AdminCrud from '@/components/admin/AdminCrud'
import ConfigurationBuilder from '@/components/admin/ConfigurationBuilder'

export default function AdminScorecardsPage() {
  return (
    <>
      <AdminCrud
        entity="scorecards"
        title="Scorecard Templates"
        subtitle="Screening and interview scoring templates."
        columns={[
          { name: 'name', label: 'Name' },
          { name: 'scorecardType', label: 'Type' },
          { name: 'active', label: 'Active' },
        ]}
        fields={[
          { name: 'name', label: 'Name', required: true },
          {
            name: 'scorecardType',
            label: 'Type',
            type: 'select',
            options: [
              { value: 'SCREENING', label: 'Screening' },
              { value: 'INTERVIEW', label: 'Interview' },
            ],
          },
          { name: 'description', label: 'Description', type: 'textarea' },
          { name: 'active', label: 'Active', type: 'checkbox' },
        ]}
      />
      <ConfigurationBuilder mode="scorecards" />
    </>
  )
}
