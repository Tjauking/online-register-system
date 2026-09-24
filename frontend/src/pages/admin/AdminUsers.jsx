import PeoplePage from '../../components/PeoplePage'

export default function AdminUsers() {
  return (
    <PeoplePage
      title="Users"
      subtitle="People who submit complaints"
      endpoint="/admin/users"
      listKey="users"
      noun="user"
      deleteNote="Also deletes their complaints, messages, feedback and attachments"
    />
  )
}
